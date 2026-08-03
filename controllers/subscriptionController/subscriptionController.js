const Razorpay = require("razorpay");
const crypto = require("crypto");
const Subscription = require("../../models/subcriptionModel/subcriptionModel");
const User = require("../../models/authModel/authModel");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── 1. Create Subscription Order ───
exports.createSubscription = async (req, res) => {
  try {
    // Safely check for user ID without crashing
    const userId = req.user?._id || req.user?.id || req.user;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed. User session not found. Please log in again.",
      });
    }

    const { planName = "Quick Med Pro", amount = 199 } = req.body;

    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `sub_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ 
        success: false, 
        message: "Razorpay order creation failed" 
      });
    }

    // Line 30 Fixed: Uses safe userId variable
    const subscription = await Subscription.create({
      userId: userId,
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
    const userId = req.user?._id || req.user?.id || req.user;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed. User session not found.",
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid payment signature!" 
      });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

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

    await User.findByIdAndUpdate(
      userId,
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