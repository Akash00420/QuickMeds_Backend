const User = require("../../models/authModel/authModel");
const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");

// --- Dashboard Stats ----------------------------------------
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const subscribedUsers = await User.countDocuments({ role: "user", isSubscribed: true });
    const activeUsers = await User.countDocuments({ role: "user", isActive: true });
    const freeUsers = totalUsers - subscribedUsers;

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        subscribedUsers,
        freeUsers,
        activeUsers,
        subscriptionRate: totalUsers > 0
          ? ((subscribedUsers / totalUsers) * 100).toFixed(1)
          : 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats.",
      error: error.message,
    });
  }
};

// --- Get All Users ------------------------------------------
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password -__v -otp -otpExpiry");

    return res.status(200).json({
      success: true,
      totalUsers: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
};

// --- Get Subscribed Users -----------------------------------
const getSubscribedUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user", isSubscribed: true })
      .select("-password -__v -otp -otpExpiry");

    return res.status(200).json({
      success: true,
      totalSubscribed: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscribed users.",
      error: error.message,
    });
  }
};

// --- Get Single User ----------------------------------------
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password -__v -otp -otpExpiry");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
      error: error.message,
    });
  }
};

// --- Toggle Subscription ------------------------------------
const toggleSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.isSubscribed = !user.isSubscribed;
    user.subscribedAt = user.isSubscribed ? new Date() : null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Subscription ${user.isSubscribed ? "activated" : "deactivated"} successfully.`,
      isSubscribed: user.isSubscribed,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to toggle subscription.",
      error: error.message,
    });
  }
};

// --- Toggle Active Status -----------------------------------
const toggleActiveStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully.`,
      isActive: user.isActive,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to toggle active status.",
      error: error.message,
    });
  }
};

// --- Delete User --------------------------------------------
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete user.",
      error: error.message,
    });
  }
};

// --- Admin: Create Vendor (no approval flow) -----------------
const createVendor = async (req, res) => {
  try {
    const {
      shopName,
      ownerName,
      email,
      phone,
      password,
      street,
      city,
      state,
      pincode,
      longitude,
      latitude,
    } = req.body;

    if (!shopName || !ownerName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "shopName, ownerName, email, phone and password are required.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    // No manual hashing — authModel's pre("save") hook hashes this automatically.
    const ownerUser = await User.create({
      name: ownerName,
      email,
      phone,
      password,
      role: "pharmacist",
      isActive: true,
    });

    const pharmacy = await Pharmacy.create({
      owner: ownerUser._id,
      name: shopName,
      registrationNumber: `ADM-${Date.now()}`,
      phone,
      email,
      address: {
        street: street || "N/A",
        city: city || "N/A",
        state: state || "N/A",
        pincode: pincode || "000000",
      },
      location: {
        type: "Point",
        coordinates: [Number(longitude) || 0, Number(latitude) || 0],
      },
      isVerified: true,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully.",
      vendor: pharmacy,
      owner: { _id: ownerUser._id, name: ownerUser.name, email: ownerUser.email },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add vendor.",
      error: error.message,
    });
  }
};

// --- Admin: Get All Vendors -----------------------------------
const getAllVendorsAdmin = async (req, res) => {
  try {
    const vendors = await Pharmacy.find()
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      totalVendors: vendors.length,
      vendors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendors.",
      error: error.message,
    });
  }
};

// --- Admin: Get Single Vendor -----------------------------------
const getVendorByIdAdmin = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await Pharmacy.findById(vendorId).populate("owner", "name email phone");

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }

    return res.status(200).json({ success: true, vendor });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor.",
      error: error.message,
    });
  }
};

// --- Admin: Toggle Vendor Active Status --------------------------
const toggleVendorActive = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await Pharmacy.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }

    vendor.isActive = !vendor.isActive;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: `Vendor ${vendor.isActive ? "activated" : "deactivated"} successfully.`,
      isActive: vendor.isActive,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to toggle vendor status.",
      error: error.message,
    });
  }
};

// --- Admin: Delete Vendor -----------------------------------------
const deleteVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await Pharmacy.findByIdAndDelete(vendorId);

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }

    await User.findByIdAndDelete(vendor.owner);

    return res.status(200).json({ success: true, message: "Vendor deleted successfully." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete vendor.",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getSubscribedUsers,
  getUserById,
  toggleSubscription,
  toggleActiveStatus,
  deleteUser,
  createVendor,
  getAllVendorsAdmin,
  getVendorByIdAdmin,
  toggleVendorActive,
  deleteVendor,
};