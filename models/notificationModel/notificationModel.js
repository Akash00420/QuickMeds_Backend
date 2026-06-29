const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =========================
    // ✅ TYPE
    // =========================
    type: {
      type: String,
      enum: [
        // Reservation events
        "reservation_confirmed",
        "reservation_ready",
        "reservation_completed",
        "reservation_cancelled",
        "reservation_expiring_soon",

        // Emergency events
        "emergency_request_received",    // → pharmacist
        "emergency_request_accepted",    // → user
        "emergency_request_fulfilled",

        // Stock alerts (pharmacist-facing)
        "low_stock_alert",
        "out_of_stock_alert",
        "restock_recommendation",        // AI-triggered

        // Outbreak / AI analytics (admin + pharmacist)
        "outbreak_alert",
        "demand_spike_alert",

        // Account events
        "account_verified",
        "pharmacy_approved",
        "pharmacy_rejected",

        // General
        "system",
      ],
      required: true,
    },

    // =========================
    // ✅ CONTENT
    // =========================
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================
    // ✅ DEEP-LINK DATA
    // =========================
    // IDs the frontend uses to navigate to the relevant screen
    data: {
      reservationId:      { type: mongoose.Schema.Types.ObjectId, default: null },
      emergencyRequestId: { type: mongoose.Schema.Types.ObjectId, default: null },
      pharmacyId:         { type: mongoose.Schema.Types.ObjectId, default: null },
      medicineId:         { type: mongoose.Schema.Types.ObjectId, default: null },
      url:                { type: String, default: null },   // fallback deep-link
    },

    // =========================
    // ✅ READ STATE
    // =========================
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },

    // =========================
    // ✅ DELIVERY CHANNELS
    // =========================
    channels: {
      inApp: { type: Boolean, default: true },
      push:  { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      sms:   { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// ----- Indexes -----
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

// ----- Auto-set readAt when marked as read -----
notificationSchema.pre("save", function () {
  if (this.isModified("isRead") && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
});

module.exports = mongoose.model("Notification", notificationSchema);