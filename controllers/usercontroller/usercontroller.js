const User = require("../models/User");
const Reservation = require("../models/Reservation");
const cloudinary = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");

// =========================
// ✅ GET PROFILE
// =========================
// GET /api/users/profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  return apiResponse.success(res, { user }, "Profile fetched");
});

// =========================
// ✅ UPDATE PROFILE
// =========================
// PUT /api/users/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return apiResponse.error(res, "User not found", 404);

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) user.address = { ...user.address, ...address };

  await user.save();

  return apiResponse.success(res, { user }, "Profile updated successfully");
});

// =========================
// ✅ UPDATE AVATAR
// =========================
// PUT /api/users/avatar
const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return apiResponse.error(res, "No image file provided", 400);

  const user = await User.findById(req.user._id);
  if (!user) return apiResponse.error(res, "User not found", 404);

  // Remove old avatar from Cloudinary if present
  if (user.avatarPublicId) {
    await cloudinary.uploader.destroy(user.avatarPublicId).catch(() => {});
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "quickmeds/avatars",
  });

  user.avatar = result.secure_url;
  user.avatarPublicId = result.public_id;
  await user.save({ validateBeforeSave: false });

  return apiResponse.success(res, { avatar: user.avatar }, "Avatar updated successfully");
});

// =========================
// ✅ UPDATE LOCATION
// =========================
// PUT /api/users/location
const updateLocation = asyncHandler(async (req, res) => {
  const { longitude, latitude } = req.body;

  if (longitude === undefined || latitude === undefined) {
    return apiResponse.error(res, "Longitude and latitude are required", 400);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    },
    { new: true }
  );

  return apiResponse.success(res, { location: user.location }, "Location updated");
});

// =========================
// ✅ UPLOAD PRESCRIPTION
// =========================
// POST /api/users/prescriptions
const uploadPrescription = asyncHandler(async (req, res) => {
  if (!req.file) return apiResponse.error(res, "No prescription file provided", 400);

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "quickmeds/prescriptions",
    resource_type: "auto",
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $push: {
        prescriptions: {
          url: result.secure_url,
          publicId: result.public_id,
          uploadedAt: new Date(),
        },
      },
    },
    { new: true }
  );

  return apiResponse.success(
    res,
    { prescriptions: user.prescriptions },
    "Prescription uploaded successfully",
    201
  );
});

// =========================
// ✅ GET MY PRESCRIPTIONS
// =========================
// GET /api/users/prescriptions
const getPrescriptions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("prescriptions");
  return apiResponse.success(res, { prescriptions: user.prescriptions }, "Prescriptions fetched");
});

// =========================
// ✅ DELETE PRESCRIPTION
// =========================
// DELETE /api/users/prescriptions/:prescriptionId
const deletePrescription = asyncHandler(async (req, res) => {
  const { prescriptionId } = req.params;

  const user = await User.findById(req.user._id);
  const prescription = user.prescriptions.find((p) => p._id.toString() === prescriptionId);

  if (!prescription) return apiResponse.error(res, "Prescription not found", 404);

  await cloudinary.uploader.destroy(prescription.publicId).catch(() => {});

  user.prescriptions = user.prescriptions.filter((p) => p._id.toString() !== prescriptionId);
  await user.save({ validateBeforeSave: false });

  return apiResponse.success(res, null, "Prescription deleted");
});

// =========================
// ✅ GET MY RESERVATION HISTORY
// =========================
// GET /api/users/reservations
const getMyReservations = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = { user: req.user._id };
  if (status) filter.status = status;

  const reservations = await Reservation.find(filter)
    .populate("pharmacy", "name address phone")
    .sort({ createdAt: -1 });

  return apiResponse.success(res, { reservations }, "Reservations fetched");
});

// =========================
// ✅ DEACTIVATE ACCOUNT
// =========================
// PUT /api/users/deactivate
const deactivateAccount = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false, refreshToken: null });

  res.clearCookie("refreshToken");

  return apiResponse.success(res, null, "Account deactivated");
});

// =========================
// ✅ ADMIN: GET ALL USERS
// =========================
// GET /api/users  (admin only)
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role) filter.role = role;

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await User.countDocuments(filter);

  return apiResponse.success(res, { users, total, page: Number(page) }, "Users fetched");
});

// =========================
// ✅ ADMIN: TOGGLE USER ACTIVE STATUS
// =========================
// PUT /api/users/:userId/toggle-status  (admin only)
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return apiResponse.error(res, "User not found", 404);

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  return apiResponse.success(res, { isActive: user.isActive }, "User status updated");
});

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  updateLocation,
  uploadPrescription,
  getPrescriptions,
  deletePrescription,
  getMyReservations,
  deactivateAccount,
  getAllUsers,
  toggleUserStatus,
};