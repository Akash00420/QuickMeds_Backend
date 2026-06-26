const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "pharmacist", "admin"],
      default: "user",
    },
    avatar: {
      type: String,       // Cloudinary URL
      default: null,
    },

    // =========================
    // ✅ LOCATION
    // =========================
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],   // [longitude, latitude]
        default: [0, 0],
      },
    },
    address: {
      street:  { type: String, default: "" },
      city:    { type: String, default: "" },
      state:   { type: String, default: "" },
      pincode: { type: String, default: "" },
    },

    // =========================
    // ✅ PRESCRIPTION UPLOADS
    // =========================
    prescriptions: [
      {
        url:        { type: String },   // Cloudinary URL
        publicId:   { type: String },   // Cloudinary public_id
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // =========================
    // ✅ ACCOUNT STATUS
    // =========================
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // =========================
    // ✅ OTP SYSTEM
    // =========================
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },

    // =========================
    // ✅ TOKEN MANAGEMENT
    // =========================
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ----- Indexes -----
userSchema.index({ location: "2dsphere" });

// ----- Hash password before save -----
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ----- Instance method: compare password -----
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);