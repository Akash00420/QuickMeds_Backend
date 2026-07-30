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

  // ✅ Verify the pharmacy actually exists
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    return res.status(404).json({ success: false, message: "Pharmacy not found" });
  }

  const formattedItems = [];
  let calculatedTotalAmount = 0;

  // Loop through items to fetch live snapshot from Database
  for (const item of items) {
    const medicineData = await Medicine.findById(item.medicineId);

    if (!medicineData) {
      return res.status(404).json({
        success: false,
        message: `Medicine with ID ${item.medicineId} not found`,
      });
    }

    // ✅ CRITICAL: Ensure medicine belongs to the selected pharmacy
    // Prevents cross-vendor reservation (e.g. Band Aid from Vendor B shown on Vendor A)
    if (medicineData.pharmacy.toString() !== pharmacyId.toString()) {
      return res.status(400).json({
        success: false,
        message: `Medicine "${medicineData.name}" does not belong to the selected pharmacy`,
      });
    }

    // ✅ Ensure medicine is in stock
    if (!medicineData.isAvailable || medicineData.quantity < Number(item.quantity)) {
      return res.status(400).json({
        success: false,
        message: `"${medicineData.name}" does not have sufficient stock`,
      });
    }

    // Push complete object satisfying Mongoose Schema requirements
    formattedItems.push({
      medicine: item.medicineId,
      name: medicineData.name,          // snapshot
      price: medicineData.sellingPrice, // snapshot
      quantity: Number(item.quantity),
    });

    // Calculate subtotal for this item
    calculatedTotalAmount += medicineData.sellingPrice * Number(item.quantity);
  }

  // Create the reservation
  const newReservation = await Reservation.create({
    user: req.user._id,
    pharmacy: pharmacyId,
    items: formattedItems,
    totalAmount: calculatedTotalAmount,
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

// 4. GET PHARMACY RESERVATIONS  (only for the logged-in vendor's pharmacy)
const getPharmacyReservations = asyncHandler(async (req, res) => {
  // Find the pharmacy that belongs to this vendor
  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });

  if (!pharmacy) {
    return res.status(404).json({
      success: false,
      message: "No pharmacy found for this vendor. Please register your pharmacy first.",
    });
  }

  // Build query — always scope to this pharmacy
  const query = { pharmacy: pharmacy._id };

  // Optional status filter from query param  e.g. ?status=pending
  const { status } = req.query;
  if (status) query.status = status;

  const reservations = await Reservation.find(query)
    .populate("user", "name email phone")
    .populate("items.medicine", "name")
    .sort({ createdAt: -1 });

  return apiResponse.success(res, { reservations }, "Fetched");
});

// 5. UPDATE STATUS
const updateReservationStatus = asyncHandler(async (req, res) => {
  const { reservationId } = req.params;
  const { status, pharmacistNote } = req.body;

  const ALLOWED_STATUSES = ["confirmed", "ready", "completed", "cancelled"];
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status value." });
  }

  // Make sure this reservation belongs to this vendor's pharmacy
  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) {
    return res.status(403).json({ success: false, message: "Pharmacy not found for this vendor." });
  }

  const reservation = await Reservation.findOne({
    _id: reservationId,
    pharmacy: pharmacy._id,
  });

  if (!reservation) {
    return res.status(404).json({ success: false, message: "Reservation not found." });
  }

  // Apply status timestamps
  reservation.status = status;
  if (pharmacistNote) reservation.pharmacistNote = pharmacistNote;
  if (status === "confirmed")  reservation.confirmedAt  = new Date();
  if (status === "ready")      reservation.readyAt       = new Date();
  if (status === "completed")  reservation.completedAt   = new Date();
  if (status === "cancelled") {
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = pharmacistNote || "Cancelled by pharmacist";
  }

  await reservation.save();

  return apiResponse.success(res, { reservation }, "Status updated successfully");
});

// 6. CANCEL RESERVATION
const cancelReservation = asyncHandler(async (req, res) => {
  const { reservationId } = req.params;

  // User can only cancel their own reservation
  const reservation = await Reservation.findOne({
    _id: reservationId,
    user: req.user._id,
  });

  if (!reservation) {
    return res.status(404).json({ success: false, message: "Reservation not found." });
  }

  if (["completed", "cancelled"].includes(reservation.status)) {
    return res.status(400).json({ success: false, message: "Cannot cancel a reservation that is already completed or cancelled." });
  }

  reservation.status = "cancelled";
  reservation.cancelledAt = new Date();
  reservation.cancellationReason = req.body.reason || "Cancelled by user";
  await reservation.save();

  return apiResponse.success(res, { reservation }, "Reservation cancelled");
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