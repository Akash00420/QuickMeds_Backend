const Razorpay = require("razorpay");
const crypto = require("crypto");
const Subscription = require("../models/subscriptionModel/subscriptionModel");
const User = require("../models/userModel/userModel");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── 1. Create Subscription Order ───
exports.createSubscription = async (req, res) => {
  try {
    const { planName = "Quick Med Pro", amount = 199 } = req.body; // Default amount ₹199 man lete hain

    const options = {
      amount: amount * 100, // Paise mein
      currency: "INR",
      receipt: `sub_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ success: false, message: "Razorpay order creation failed" });
    }

    // Database mein 'created' status ke sath save karein
    const subscription = await Subscription.create({
      userId: req.user.id,
      orderId: order.id,
      planName,
      amount,
      status: "created",
    });

    res.status(200).json({
      success: true,
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create Subscription Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 2. Verify Subscription Payment ───
exports.verifySubscriptionPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Signature Verify Karein
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Invalid payment signature!" });
    }

    // 30 days ki validity calculate karein
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // Subscription ko 'paid' mark karein
    const subscription = await Subscription.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        paymentId: razorpay_payment_id,
        status: "paid",
        startDate: new Date(),
        expiryDate: expiryDate,
      },
      { new: true }
    );

    // User Model mein isSubscribed TRUE karein
    await User.findByIdAndUpdate(
      req.user.id,
      {
        isSubscribed: true,
        subscriptionExpiry: expiryDate,
      }
    );

    res.status(200).json({ 
      success: true, 
      message: "Subscription Activated Successfully!",
      subscription 
    });
  } catch (error) {
    console.error("Verify Subscription Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 3. Get All Subscriptions (Admin) ───
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subs = await Subscription.find().populate("userId", "name email");
    res.status(200).json({ success: true, count: subs.length, data: subs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};