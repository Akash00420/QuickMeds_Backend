const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../../models/authModel/authModel");
const calculateDeliveryFee = require("../../utils/calculateDeliveryFee");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── 1. Create Medicine Order ───
exports.createMedicineOrder = async (req, res) => {
  try {
    const { amount, items } = req.body; 

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid order amount" });
    }

    const baseAmount = Number(amount);

    // Fetch user details from database
    const user = await User.findById(req.user.id);
    const currentDate = new Date();

    // Check if user has an active subscription
    const hasActiveSubscription = Boolean(
      user?.isSubscribed && user?.subscriptionExpiry && new Date(user.subscriptionExpiry) > currentDate
    );

    // Calculate delivery charge using the utility helper
    const deliveryCharge = calculateDeliveryFee(baseAmount, hasActiveSubscription);
    const totalAmount = baseAmount + deliveryCharge;

    const options = {
      amount: totalAmount * 100, // Convert to paise for Razorpay
      currency: "INR",
      receipt: `med_${Date.now()}`,
      notes: { 
        userId: req.user.id,
        baseAmount,
        deliveryCharge,
        isSubscribedUser: hasActiveSubscription ? "Yes" : "No"
      },
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order,
      baseAmount,
      deliveryCharge,
      totalAmount,
      keyId: process.env.RAZORPAY_KEY_ID,
      message: deliveryCharge === 0 
        ? "Yay! Free Delivery applied." 
        : `₹${deliveryCharge} delivery charge applied.`
    });
  } catch (error) {
    console.error("Create Medicine Order Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 2. Verify Medicine Payment ───
exports.verifyMedicinePayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Invalid payment signature!" });
    }

    res.status(200).json({
      success: true,
      message: "Order Payment Successful! We will deliver your medicines soon.",
    });
  } catch (error) {
    console.error("Verify Medicine Payment Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};