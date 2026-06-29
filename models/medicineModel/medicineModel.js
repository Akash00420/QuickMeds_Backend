const mongoose = require("mongoose");

// One document = one medicine SKU stocked at one pharmacy

const medicineSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
    },

    // =========================
    // ✅ IDENTITY
    // =========================
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      trim: true,
      default: "",
    },
    brand: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      enum: [
        "antibiotic",
        "analgesic",
        "antihistamine",
        "antiviral",
        "antifungal",
        "cardiovascular",
        "diabetes",
        "gastrointestinal",
        "respiratory",
        "vitamin",
        "supplement",
        "topical",
        "ophthalmic",
        "other",
      ],
      default: "other",
    },
    dosageForm: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "injection", "cream", "drops", "inhaler", "patch", "other"],
      default: "tablet",
    },
    strength: {
      type: String,   // e.g. "500mg", "5mg/5ml"
      default: "",
    },
    manufacturer: {
      type: String,
      trim: true,
      default: "",
    },
    requiresPrescription: {
      type: Boolean,
      default: false,
    },

    // =========================
    // ✅ STOCK MANAGEMENT
    // =========================
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      enum: ["strips", "bottles", "vials", "tubes", "units"],
      default: "strips",
    },
    lowStockThreshold: {
      type: Number,
      default: 5,   // triggers low_stock_alert notification
    },
    stockLastUpdated: {
      type: Date,
      default: Date.now,
    },
    stockLastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // =========================
    // ✅ PRICING
    // =========================
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },

    // =========================
    // ✅ BATCH & EXPIRY
    // =========================
    batchNumber: {
      type: String,
      default: "",
    },
    expiryDate: {
      type: Date,
      default: null,
    },

    // =========================
    // ✅ MEDIA
    // =========================
    image: {
      url:      { type: String, default: null },   // Cloudinary URL
      publicId: { type: String, default: null },
    },

    // =========================
    // ✅ AVAILABILITY
    // =========================
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // =========================
    // ✅ AI ANALYTICS
    // =========================
    totalSold: {
      type: Number,
      default: 0,   // incremented on reservation completion; feeds demand model
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
medicineSchema.index({ name: "text", genericName: "text", brand: "text" });  // full-text search
medicineSchema.index({ pharmacy: 1, isAvailable: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ quantity: 1 });
medicineSchema.index({ expiryDate: 1 });

// ----- Virtual: stock status label (maps to UI pin colours) -----
medicineSchema.virtual("stockStatus").get(function () {
  if (this.quantity === 0)                        return "out_of_stock";   // red
  if (this.quantity <= this.lowStockThreshold)    return "low";            // amber
  return "available";                                                       // green
});

// ----- Auto-mark unavailable when stock hits 0 -----
medicineSchema.pre("save", function () {
  if (this.isModified("quantity")) {
    this.isAvailable       = this.quantity > 0;
    this.stockLastUpdated  = new Date();
  }
});

module.exports = mongoose.model("Medicine", medicineSchema);