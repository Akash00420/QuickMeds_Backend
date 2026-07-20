const Reservation = require("../../models/reservationModel/reservationModel");
const Medicine = require("../../models/medicineModel/medicineModel");
const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");
const Notification = require("../../models/notificationModel/notificationModel");
const cloudinary = require("../../config/cloudinary");
const asyncHandler = require("../../utils/asyncHandler");
const apiResponse = require("../../utils/apiResponse");

// 1. CREATE RESERVATION (Yahan Database save logic fix kiya gaya hai)
const createReservation = asyncHandler(async (req, res) => {
  const { pharmacyId, notes, items } = req.body;

  // Validation
  if (!pharmacyId || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Pharmacy and items are required" });
  }

  // Frontend se 'medicineId' aa raha hai, usko DB model ke 'medicine' key me map karna
  const formattedItems = items.map((item) => ({
    medicine: item.medicineId,
    quantity: item.quantity,
  }));

  // Database mein Create karna
  const newReservation = await Reservation.create({
    user: req.user._id,
    pharmacy: pharmacyId,
    items: formattedItems,
    notes: notes || "",
    status: "pending",
  });

  return apiResponse.success(res, { success: true, reservation: newReservation }, "Reservation created successfully");
});

// 2. GET USER RESERVATIONS (Yahan Populate lagaya gaya hai taaki naam dikhe)
const getUserReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({ user: req.user._id })
    .populate("pharmacy", "name") // Pharmacy ka naam fetch karega
    .populate("items.medicine", "name") // Medicine ka naam fetch karega
    .sort({ createdAt: -1 }); // Naya sabse upar

  return apiResponse.success(res, { reservations }, "Fetched");
});

// 3. GET BY ID
const getReservationById = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.reservationId)
    .populate("pharmacy", "name")
    .populate("items.medicine", "name");
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

// 7. GET PROFILE STATS
const getProfileStats = asyncHandler(async (req, res) => {
  const totalReservations = await Reservation.countDocuments({ user: req.user._id });
  return apiResponse.success(res, { stats: { totalOrders: 0, totalReservations } }, "Stats fetched");
});

module.exports = {
  createReservation,
  getUserReservations,
  getReservationById,
  getPharmacyReservations,
  updateReservationStatus,
  cancelReservation,
  getProfileStats,
};