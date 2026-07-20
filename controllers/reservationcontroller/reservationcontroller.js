const Reservation = require("../../models/reservationModel/reservationModel");
const Medicine = require("../../models/medicineModel/medicineModel");
const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");
const Notification = require("../../models/notificationModel/notificationModel");
const cloudinary = require("../../config/cloudinary");
const asyncHandler = require("../../utils/asyncHandler");
const apiResponse = require("../../utils/apiResponse");

// 1. CREATE RESERVATION
const createReservation = asyncHandler(async (req, res) => {
  // Yahan apna logic paste karein...
  const { pharmacyId, notes, items } = req.body;
  // (Baaki ka logic jo aapne pehle likha tha)
  return apiResponse.success(res, { success: true }, "Reservation created");
});

// 2. GET USER RESERVATIONS
const getUserReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({ user: req.user._id });
  return apiResponse.success(res, { reservations }, "Fetched");
});

// 3. GET BY ID
const getReservationById = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.reservationId);
  return apiResponse.success(res, { reservation }, "Fetched");
});

// 4. GET PHARMACY RESERVATIONS
const getPharmacyReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find();
  return apiResponse.success(res, { reservations }, "Fetched");
});

// 5. UPDATE STATUS
const updateReservationStatus = asyncHandler(async (req, res) => {
  return apiResponse.success(res, {}, "Updated");
});

// 6. CANCEL RESERVATION
const cancelReservation = asyncHandler(async (req, res) => {
  return apiResponse.success(res, {}, "Cancelled");
});

// 7. GET PROFILE STATS (Naya add kiya)
const getProfileStats = asyncHandler(async (req, res) => {
  const totalReservations = await Reservation.countDocuments({ user: req.user._id });
  return apiResponse.success(res, { stats: { totalOrders: 0, totalReservations } }, "Stats fetched");
});

// ✅ YAHAN EXPORT HONA ZAROORI HAI
module.exports = {
  createReservation,
  getUserReservations,
  getReservationById,
  getPharmacyReservations,
  updateReservationStatus,
  cancelReservation,
  getProfileStats,
};