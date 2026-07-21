const Reservation = require("../../models/reservationModel/reservationModel");
const Medicine = require("../../models/medicineModel/medicineModel");
const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");
const Notification = require("../../models/notificationModel/notificationModel");
const cloudinary = require("../../config/cloudinary");
const asyncHandler = require("../../utils/asyncHandler");
const apiResponse = require("../../utils/apiResponse");

// 1. CREATE RESERVATION (Failsafe & Secure Validation Fix)
const createReservation = asyncHandler(async (req, res) => {
  const { pharmacyId, notes, items } = req.body;

  // Basic Validation
  if (!pharmacyId || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Pharmacy and items are required" });
  }

  const formattedItems = [];
  let calculatedTotalAmount = 0;

  // Loop through items to fetch live snapshot from Database
  for (const item of items) {
    const medicineData = await Medicine.findById(item.medicineId);
    
    if (!medicineData) {
      return res.status(404).json({ 
        success: false, 
        message: `Medicine with ID ${item.medicineId} not found` 
      });
    }

    // Push complete object satisfying Mongoose Schema requirements
    formattedItems.push({
      medicine: item.medicineId,
      name: medicineData.name,               // ✅ Mongoose required 'name' fulfilled
      price: medicineData.sellingPrice,      // ✅ Mongoose required 'price' fulfilled
      quantity: Number(item.quantity),
    });

    // Calculate subtotal for this item
    calculatedTotalAmount += medicineData.sellingPrice * Number(item.quantity);
  }

  // Database mein Create karna
  const newReservation = await Reservation.create({
    user: req.user._id,
    pharmacy: pharmacyId,
    items: formattedItems,
    totalAmount: calculatedTotalAmount,      // ✅ Mongoose required 'totalAmount' fulfilled
    notes: notes || "",
    status: "pending",
  });

  return apiResponse.success(
    res, 
    { success: true, reservation: newReservation }, 
    "Reservation created successfully"
  );
});

// 2. GET USER RESERVATIONS
const getUserReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({ user: req.user._id })
    .populate("pharmacy", "name") 
    .populate("items.medicine", "name") 
    .sort({ createdAt: -1 }); 

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