const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../../models/authModel/authModel");
// Agar aapka koi Medicine Order ka model hai toh usko yahan import karein
// const MedicineOrder = require("../models/orderModel/orderModel"); 

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── 1. Create Medicine Order (Delivery Logic Here) ───
exports.createMedicineOrder = async (req, res) => {
  try {
    const { amount, items } = req.body; 

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid order amount" });
    }

    const baseAmount = Number(amount);
    let deliveryCharge = 50; // Default charge

    // User data fetch karein
    const user = await User.findById(req.user.id);
    const currentDate = new Date();

    // Check karein user subscribed hai ya nahi
    const hasActiveSubscription = user.isSubscribed && user.subscriptionExpiry > currentDate;

    // DELIVERY LOGIC:
    // 1. Agar Subscribed hai -> Delivery FREE (0)
    // 2. Agar Subscribed nahi hai par Amount 500 ya usse zyada hai -> Delivery FREE (0)
    // 3. Varna -> ₹50 charge
    if (hasActiveSubscription || baseAmount >= 500) {
      deliveryCharge = 0;
    }

    const totalAmount = baseAmount + deliveryCharge;

    const options = {
      amount: totalAmount * 100, // Paise mein
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

    // YAHAN AAP APNE MEDICINE ORDER MODEL MEIN DATA SAVE KAR SAKTE HAIN
    // await MedicineOrder.create({ userId: req.user.id, orderId: order.id, totalAmount, deliveryCharge, status: "pending" ... })

    res.status(200).json({
      success: true,
      order,
      baseAmount,
      deliveryCharge,
      totalAmount,
      keyId: process.env.RAZORPAY_KEY_ID,
      message: deliveryCharge === 0 ? "Yay! Free Delivery applied." : "₹50 delivery charge applied."
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

    // YAHAN AAP APNE MEDICINE ORDER KO "SUCCESS" MARK KARENGE
    // await MedicineOrder.findOneAndUpdate({ orderId: razorpay_order_id }, { paymentId: razorpay_payment_id, status: "paid" });

    res.status(200).json({
      success: true,
      message: "Order Payment Successful! We will deliver your medicines soon.",
    });
  } catch (error) {
    console.error("Verify Medicine Payment Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};