const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
    },

    // =========================
    // ✅ ITEMS (price snapshot)
    // =========================
    // Prices and names are copied at reservation time so historical
    // records stay accurate even if medicine data changes later.
    items: [
      {
        medicine:  { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
        name:      { type: String, required: true },   // snapshot
        quantity:  { type: Number, required: true, min: 1 },
        price:     { type: Number, required: true },   // selling price snapshot
        _id:       false,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // =========================
    // ✅ STATUS FLOW
    // =========================
    // pending → confirmed → ready → completed
    //         ↘ cancelled / expired
    status: {
      type: String,
      enum: ["pending", "confirmed", "ready", "completed", "cancelled", "expired"],
      default: "pending",
    },

    // =========================
    // ✅ PRESCRIPTION
    // =========================
    prescription: {
      url:      { type: String, default: null },   // Cloudinary URL
      publicId: { type: String, default: null },
    },

    // =========================
    // ✅ NOTES
    // =========================
    notes: {
      type: String,
      maxlength: 500,
      default: "",
    },
    pharmacistNote: {
      type: String,
      maxlength: 500,
      default: "",
    },

    // =========================
    // ✅ TIMESTAMPS (status events)
    // =========================
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 60 * 60 * 1000),   // 2-hour hold window
    },
    confirmedAt:        { type: Date, default: null },
    readyAt:            { type: Date, default: null },
    completedAt:        { type: Date, default: null },
    cancelledAt:        { type: Date, default: null },
    cancellationReason: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// ----- Indexes -----
reservationSchema.index({ user: 1, status: 1 });
reservationSchema.index({ pharmacy: 1, status: 1 });
reservationSchema.index({ createdAt: -1 });
reservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });   // TTL: MongoDB auto-deletes after expiresAt

// ----- On completion: increment totalSold on each medicine -----
reservationSchema.post("save", async function (doc) {
  if (doc.status === "completed") {
    const Medicine = require("../medicineModel/medicineModel");
    for (const item of doc.items) {
      await Medicine.findByIdAndUpdate(item.medicine, {
        $inc: { totalSold: item.quantity },
      });
    }
  }
});

module.exports = mongoose.model("Reservation", reservationSchema);