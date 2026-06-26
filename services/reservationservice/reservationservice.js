const Reservation = require("../../models/reservationModel/reservationModel");
const Medicine = require("../../models/medicineModel/medicineModel");

// =========================
// ✅ RESERVATION SERVICE
// =========================
// Shared logic for building reservations, validating stock across
// multiple items at once, and handling the "hold then release" stock
// pattern (decrement on create, restore on cancel/expiry).

// ----- Validate items + build the reservation item list with price snapshots -----
// items: [{ medicineId, quantity }]
const buildReservationItems = async (pharmacyId, items) => {
  const reservationItems = [];
  let totalAmount = 0;
  let requiresPrescription = false;

  for (const { medicineId, quantity } of items) {
    const medicine = await Medicine.findById(medicineId);

    if (!medicine || medicine.pharmacy.toString() !== pharmacyId.toString()) {
      throw new Error(`Medicine ${medicineId} not found at this pharmacy`);
    }
    if (medicine.quantity < quantity) {
      throw new Error(`Insufficient stock for ${medicine.name}`);
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

  return { reservationItems, totalAmount, requiresPrescription };
};

// ----- Hold stock for all items in a reservation (decrement quantities) -----
const holdStock = async (reservationItems) => {
  for (const item of reservationItems) {
    await Medicine.findByIdAndUpdate(item.medicine, {
      $inc: { quantity: -item.quantity },
    });
  }
};

// ----- Release stock for all items in a reservation (restore quantities) -----
const releaseStock = async (reservationItems) => {
  for (const item of reservationItems) {
    await Medicine.findByIdAndUpdate(item.medicine, {
      $inc: { quantity: item.quantity },
    });
  }
};

// ----- Find reservations that have expired but are still "pending" -----
// Intended to be run on a cron/interval to auto-cancel + restore stock,
// as a backstop alongside the model's own TTL index.
const findExpiredPendingReservations = async () => {
  return Reservation.find({
    status: "pending",
    expiresAt: { $lte: new Date() },
  });
};

// ----- Auto-expire a single reservation and restore its stock -----
const expireReservation = async (reservationId) => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation || reservation.status !== "pending") return null;

  await releaseStock(reservation.items);

  reservation.status = "expired";
  await reservation.save();

  return reservation;
};

module.exports = {
  buildReservationItems,
  holdStock,
  releaseStock,
  findExpiredPendingReservations,
  expireReservation,
};