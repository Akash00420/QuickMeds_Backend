const User = require("../../models/userModel/userModel");

// --- Dashboard Stats ----------------------------------------
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers      = await User.countDocuments({ role: "customer" });
    const subscribedUsers = await User.countDocuments({ role: "customer", isSubscribed: true });
    const activeUsers     = await User.countDocuments({ role: "customer", isActive: true });
    const freeUsers       = totalUsers - subscribedUsers;

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
    const users = await User.find({ role: "customer" }).select("-password -__v -otp -otpExpiry");

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
    const users = await User.find({ role: "customer", isSubscribed: true })
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

module.exports = {
  getDashboardStats,
  getAllUsers,
  getSubscribedUsers,
  getUserById,
  toggleSubscription,
  toggleActiveStatus,
  deleteUser,
};