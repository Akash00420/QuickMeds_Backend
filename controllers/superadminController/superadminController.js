const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/authModel/authModel");
const { SECRET_KEY } = require("../../utils/config");

// 🔹 Create default superadmin on server startup
const createDefaultSuperAdmin = async () => {
  try {
    const existing = await User.findOne({
      email: process.env.SUPERADMIN_EMAIL,
      role: "superadmin",
    });

    if (existing) {
      console.log("ℹ️ SuperAdmin already exists — no changes made.");
      return;
    }

    await User.create({
      name: "Super Admin",
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD,
      role: "superadmin",
      isVerified: true,
    });

    console.log("✅ Default SuperAdmin created successfully");
  } catch (err) {
    console.log("❌ Failed to create default SuperAdmin:", err.message);
  }
};

// 🔹 POST /api/superadmin/login
const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const superadmin = await User.findOne({
      email: email.toLowerCase(),
      role: "superadmin",
    }).select("+password");

    if (!superadmin) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await superadmin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: superadmin._id, role: superadmin.role },
      SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      token,
      superadmin: {
        id: superadmin._id,
        name: superadmin.name,
        email: superadmin.email,
        role: superadmin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Server error during login" });
  }
};

// 🔹 Admin management (superadmin actions on admins)
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" });
    res.status(200).json({ success: true, data: { admins } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { name, email } = req.body;
    const generatedPassword = Math.random().toString(36).slice(-10);

    const admin = await User.create({
      name,
      email,
      password: generatedPassword,
      role: "admin",
      isVerified: true,
    });

    res.status(201).json({ success: true, data: { admin, generatedPassword } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const toggleAdminStatus = async (req, res) => {
  try {
    const admin = await User.findByIdAndUpdate(
      req.params.adminId,
      { isActive: req.body.isActive },
      { new: true }
    );
    res.status(200).json({ success: true, data: { admin } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.adminId);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createDefaultSuperAdmin,
  loginSuperAdmin,
  getAllAdmins,
  createAdmin,
  toggleAdminStatus,
  deleteAdmin,
};