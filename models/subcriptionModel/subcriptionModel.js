const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    // User jisne subscription liya hai
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // Razorpay Order ID (Order create hote time save hoga)
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    
    // Razorpay Payment ID (Payment verify hone ke baad save hoga)
    paymentId: {
      type: String,
      default: null,
    },
    
    // Subscription Plan ka naam (e.g., "Premium", "Gold", "Quick Med Pro")
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Amount jo user ne pay kiya
    amount: {
      type: Number,
      required: true,
    },
    
    // Subscription / Payment ka current status
    status: {
      type: String,
      enum: ["created", "paid", "failed", "cancelled", "expired"],
      default: "created",
    },
    
    // Subscription kab start hua (Payment success par set hoga)
    startDate: {
      type: Date,
      default: null,
    },
    
    // Subscription kab khatam hoga (e.g., 30 days baad)
    expiryDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt aur updatedAt automatically add ho jayenge
  }
);

// Optimize queries: userId aur status ke basis par search fast karne ke liye index
subscriptionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);