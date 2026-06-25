const mongoose = require("mongoose");

const pharmacySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    // =========================
    // ✅ ADDRESS & LOCATION
    // =========================
    address: {
      street:  { type: String, required: true },
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      pincode: { type: String, required: true },
    },
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

    // =========================
    // ✅ MEDIA & DOCUMENTS
    // =========================
    images: [
      {
        url:      { type: String },   // Cloudinary URL
        publicId: { type: String },   // Cloudinary public_id
      },
    ],
    licenseDocument: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },

    // =========================
    // ✅ OPERATING HOURS
    // =========================
    isOpen24Hours: {
      type: Boolean,
      default: false,
    },
    operatingHours: [
      {
        day:      { type: String, enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
        open:     { type: String, default: "09:00" },   // "HH:MM" 24-hr
        close:    { type: String, default: "21:00" },
        isClosed: { type: Boolean, default: false },
        _id:      false,
      },
    ],

    // =========================
    // ✅ ACCOUNT STATUS
    // =========================
    isVerified: {
      type: Boolean,
      default: false,   // Admin must approve before pharmacy goes live
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    acceptsEmergencyRequests: {
      type: Boolean,
      default: true,
    },

    // =========================
    // ✅ RATINGS
    // =========================
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count:   { type: Number, default: 0 },
    },

    // =========================
    // ✅ INVENTORY SUMMARY
    // =========================
    medicineCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
pharmacySchema.index({ location: "2dsphere" });
pharmacySchema.index({ isVerified: 1, isActive: 1 });
pharmacySchema.index({ "address.city": 1 });

// ----- Virtual: is the pharmacy open right now? -----
pharmacySchema.virtual("isCurrentlyOpen").get(function () {
  if (this.isOpen24Hours) return true;

  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const now = new Date();
  const todayKey = days[now.getDay()];
  const todayHours = (this.operatingHours || []).find((h) => h.day === todayKey);

  if (!todayHours || todayHours.isClosed) return false;

  const [openH, openM]   = todayHours.open.split(":").map(Number);
  const [closeH, closeM] = todayHours.close.split(":").map(Number);
  const nowMinutes       = now.getHours() * 60 + now.getMinutes();

  return nowMinutes >= openH * 60 + openM && nowMinutes <= closeH * 60 + closeM;
});

module.exports = mongoose.model("Pharmacy", pharmacySchema);