const mongoose = require("mongoose");

const emergencyRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =========================
    // ✅ MEDICINE DETAILS
    // =========================
    medicineName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    urgencyLevel: {
      type: String,
      enum: ["critical", "high", "medium"],
      default: "high",
    },

    // =========================
    // ✅ PATIENT LOCATION
    // =========================
    // Broadcast to all pharmacies within broadcastRadius km
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],   // [longitude, latitude]
        required: true,
      },
    },
    address: {
      type: String,
      default: "",
    },
    contactPhone: {
      type: String,
      required: true,
    },

    // =========================
    // ✅ NOTES & PRESCRIPTION
    // =========================
    notes: {
      type: String,
      maxlength: 500,
      default: "",
    },
    prescription: {
      url:      { type: String, default: null },   // Cloudinary URL
      publicId: { type: String, default: null },
    },

    // =========================
    // ✅ STATUS FLOW
    // =========================
    // open → responded → fulfilled
    //      ↘ cancelled / expired
    status: {
      type: String,
      enum: ["open", "responded", "fulfilled", "cancelled", "expired"],
      default: "open",
    },

    // =========================
    // ✅ PHARMACY RESPONSES
    // =========================
    // Each notified pharmacy gets its own response entry
    pharmacyResponses: [
      {
        pharmacy:    { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
        status:      { type: String, enum: ["notified", "accepted", "rejected", "fulfilled"], default: "notified" },
        message:     { type: String, default: "" },
        respondedAt: { type: Date, default: null },
        _id:         false,
      },
    ],

    // =========================
    // ✅ FULFILMENT
    // =========================
    fulfilledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },

    // =========================
    // ✅ BROADCAST CONFIG
    // =========================
    broadcastRadius: {
      type: Number,
      default: 5,   // km — auto-expanded if no pharmacy responds
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 4 * 60 * 60 * 1000),   // 4-hour window
    },
  },
  {
    timestamps: true,
  }
);

// ----- Indexes -----
emergencyRequestSchema.index({ location: "2dsphere" });
emergencyRequestSchema.index({ status: 1 });
emergencyRequestSchema.index({ requestedBy: 1 });
emergencyRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });   // TTL auto-delete

module.exports = mongoose.model("EmergencyRequest", emergencyRequestSchema);