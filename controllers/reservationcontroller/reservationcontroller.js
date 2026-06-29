const Reservation = require("../../models/reservationModel/reservationModel");
const Medicine = require("../../models/medicineModel/medicineModel");
const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");
const Notification = require("../../models/notificationModel/notificationModel");
const cloudinary = require("../../config/cloudinary");
const asyncHandler = require("../../utils/asyncHandler");
const apiResponse = require("../../utils/apiResponse");

// =========================
// ✅ CREATE RESERVATION
// =========================
// POST /api/reservations
const createReservation = asyncHandler(async (req, res) => {
  const { pharmacyId, notes } = req.body;
  let items = req.body.items;
  // items: [{ medicineId, quantity }]

  // ✅ form-data sends every field as a string — parse items if needed
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch (e) {
      return apiResponse.error(res, "Items must be valid JSON", 400);
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    return apiResponse.error(res, "At least one item is required", 400);
  }

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy || !pharmacy.isActive) {
    return apiResponse.error(res, "Pharmacy not found or inactive", 404);
  }

  const reservationItems = [];
  let totalAmount = 0;
  let requiresPrescription = false;

  for (const { medicineId, quantity } of items) {
    const medicine = await Medicine.findById(medicineId);

    if (!medicine || medicine.pharmacy.toString() !== pharmacyId) {
      return apiResponse.error(res, `Medicine ${medicineId} not found at this pharmacy`, 404);
    }
    if (medicine.quantity < quantity) {
      return apiResponse.error(res, `Insufficient stock for ${medicine.name}`, 400);
    }
    if (medicine.requiresPrescription) requiresPrescription = true;

    reservationItems.push({
      medicine: medicine._id,
      name: medicine.name,
      quantity,
      price: medicine.sellingPrice,
    });
    totalAmount += medicine.sellingPrice * quantity;
  }

  if (requiresPrescription && !req.file) {
    return apiResponse.error(res, "Prescription upload is required for one or more items", 400);
  }

  let prescription = null;
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "quickmeds/reservation-prescriptions",
      resource_type: "auto",
    });
    prescription = { url: result.secure_url, publicId: result.public_id };
  }

  const reservation = await Reservation.create({
    user: req.user._id,
    pharmacy: pharmacyId,
    items: reservationItems,
    totalAmount,
    notes,
    prescription,
  });

  // Decrement stock immediately to hold it for the reservation window
  for (const item of reservationItems) {
    const med = await Medicine.findById(item.medicine);
    med.quantity = Math.max(0, med.quantity - item.quantity);
    await med.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`medicine:${med._id}`).emit("stock:updated", {
        medicineId: med._id,
        quantity: med.quantity,
        stockStatus: med.stockStatus,
      });
    }
  }

  await Notification.create({
    recipient: pharmacy.owner,
    type: "reservation_confirmed",
    title: "New Reservation",
    message: `A new reservation (${reservationItems.length} item(s)) was placed at ${pharmacy.name}.`,
    data: { reservationId: reservation._id, pharmacyId: pharmacy._id },
  });

  return apiResponse.success(res, { reservation }, "Reservation created successfully", 201);
});

// =========================
// ✅ GET RESERVATION BY ID
// =========================
// GET /api/reservations/:reservationId
const getReservationById = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.reservationId)
    .populate("user", "name email phone")
    .populate("pharmacy", "name address phone location");

  if (!reservation) return apiResponse.error(res, "Reservation not found", 404);

  const isOwner = reservation.user._id.toString() === req.user._id.toString();
  const isPharmacist =
    req.user.role === "pharmacist" &&
    (await Pharmacy.exists({ _id: reservation.pharmacy._id, owner: req.user._id }));

  if (!isOwner && !isPharmacist && req.user.role !== "admin") {
    return apiResponse.error(res, "Not authorized to view this reservation", 403);
  }

  return apiResponse.success(res, { reservation }, "Reservation fetched");
});

// =========================
// ✅ GET PHARMACY RESERVATIONS  (pharmacist)
// =========================
// GET /api/reservations/pharmacy?status=pending
const getPharmacyReservations = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) return apiResponse.error(res, "No pharmacy linked to this account", 404);

  const filter = { pharmacy: pharmacy._id };
  if (status) filter.status = status;

  const reservations = await Reservation.find(filter)
    .populate("user", "name phone")
    .sort({ createdAt: -1 });

  return apiResponse.success(res, { reservations }, "Pharmacy reservations fetched");
});

// =========================
// ✅ UPDATE RESERVATION STATUS  (pharmacist)
// =========================
// PATCH /api/reservations/:reservationId/status
const updateReservationStatus = asyncHandler(async (req, res) => {
  const { status, pharmacistNote } = req.body;
  const validStatuses = ["confirmed", "ready", "completed", "cancelled"];

  if (!validStatuses.includes(status)) {
    return apiResponse.error(res, "Invalid status value", 400);
  }

  const reservation = await Reservation.findById(req.params.reservationId).populate("pharmacy");
  if (!reservation) return apiResponse.error(res, "Reservation not found", 404);

  if (reservation.pharmacy.owner.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized to update this reservation", 403);
  }

  reservation.status = status;
  if (pharmacistNote) reservation.pharmacistNote = pharmacistNote;

  const timestampField = { confirmed: "confirmedAt", ready: "readyAt", completed: "completedAt", cancelled: "cancelledAt" };
  reservation[timestampField[status]] = new Date();

  await reservation.save();

  const notifTypeMap = {
    confirmed: "reservation_confirmed",
    ready: "reservation_ready",
    completed: "reservation_completed",
    cancelled: "reservation_cancelled",
  };

  await Notification.create({
    recipient: reservation.user,
    type: notifTypeMap[status],
    title: `Reservation ${status}`,
    message: `Your reservation at ${reservation.pharmacy.name} is now ${status}.`,
    data: { reservationId: reservation._id, pharmacyId: reservation.pharmacy._id },
  });

  const io = req.app.get("io");
  if (io) {
    io.to(`user:${reservation.user}`).emit("reservation:status_changed", {
      reservationId: reservation._id,
      status,
    });
  }

  return apiResponse.success(res, { reservation }, "Reservation status updated");
});

// =========================
// ✅ CANCEL RESERVATION  (user)
// =========================
// PATCH /api/reservations/:reservationId/cancel
const cancelReservation = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const reservation = await Reservation.findById(req.params.reservationId).populate("pharmacy");
  if (!reservation) return apiResponse.error(res, "Reservation not found", 404);

  if (reservation.user.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized to cancel this reservation", 403);
  }

  if (["completed", "cancelled"].includes(reservation.status)) {
    return apiResponse.error(res, `Reservation already ${reservation.status}`, 400);
  }

  // Restore stock since the hold is released
  for (const item of reservation.items) {
    await Medicine.findByIdAndUpdate(item.medicine, { $inc: { quantity: item.quantity } });
  }

  reservation.status = "cancelled";
  reservation.cancelledAt = new Date();
  reservation.cancellationReason = reason || "Cancelled by user";
  await reservation.save();

  await Notification.create({
    recipient: reservation.pharmacy.owner,
    type: "reservation_cancelled",
    title: "Reservation Cancelled",
    message: `A reservation at ${reservation.pharmacy.name} was cancelled by the customer.`,
    data: { reservationId: reservation._id },
  });

  return apiResponse.success(res, { reservation }, "Reservation cancelled");
});

module.exports = {
  createReservation,
  getReservationById,
  getPharmacyReservations,
  updateReservationStatus,
  cancelReservation,
};