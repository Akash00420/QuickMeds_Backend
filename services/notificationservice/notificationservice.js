const Notification = require("../../models/notificationModel/notificationModel");

// =========================
// ✅ NOTIFICATION SERVICE
// =========================
// Wraps Notification.create(...) calls behind simple named functions
// so controllers don't repeat the same { type, title, message, data }
// shape everywhere — and so the wording stays consistent across the app.

const notify = async ({ recipient, type, title, message, data = {} }) => {
  return Notification.create({ recipient, type, title, message, data });
};

// ----- Reservation notifications -----
const notifyReservationStatus = async (recipientId, pharmacyName, status, reservationId, pharmacyId) => {
  const typeMap = {
    confirmed: "reservation_confirmed",
    ready: "reservation_ready",
    completed: "reservation_completed",
    cancelled: "reservation_cancelled",
  };

  return notify({
    recipient: recipientId,
    type: typeMap[status] || "system",
    title: `Reservation ${status}`,
    message: `Your reservation at ${pharmacyName} is now ${status}.`,
    data: { reservationId, pharmacyId },
  });
};

// ----- Stock alert notifications (to pharmacist) -----
const notifyLowStock = async (pharmacistId, medicineName, pharmacyName, quantity, unit, medicineId, pharmacyId) => {
  return notify({
    recipient: pharmacistId,
    type: "low_stock_alert",
    title: "Low Stock Alert",
    message: `${medicineName} is running low (${quantity} ${unit} left) at ${pharmacyName}.`,
    data: { medicineId, pharmacyId },
  });
};

const notifyOutOfStock = async (pharmacistId, medicineName, pharmacyName, medicineId, pharmacyId) => {
  return notify({
    recipient: pharmacistId,
    type: "out_of_stock_alert",
    title: "Out of Stock",
    message: `${medicineName} is now out of stock at ${pharmacyName}.`,
    data: { medicineId, pharmacyId },
  });
};

// ----- Emergency notifications -----
const notifyEmergencyReceived = async (pharmacistId, medicineName, quantity, urgencyLevel, emergencyRequestId, pharmacyId) => {
  return notify({
    recipient: pharmacistId,
    type: "emergency_request_received",
    title: "🚨 Emergency Medicine Request",
    message: `Urgent request for ${quantity} unit(s) of ${medicineName} nearby. Urgency: ${urgencyLevel}.`,
    data: { emergencyRequestId, pharmacyId },
  });
};

const notifyEmergencyAccepted = async (userId, pharmacyName, medicineName, emergencyRequestId, pharmacyId) => {
  return notify({
    recipient: userId,
    type: "emergency_request_accepted",
    title: "Pharmacy Responded",
    message: `${pharmacyName} can fulfill your emergency request for ${medicineName}.`,
    data: { emergencyRequestId, pharmacyId },
  });
};

// ----- AI / analytics notifications -----
const notifyOutbreakAlert = async (recipientId, region, medicineCategory, percentIncrease) => {
  return notify({
    recipient: recipientId,
    type: "outbreak_alert",
    title: "⚠️ Possible Outbreak Detected",
    message: `${medicineCategory} demand is up ${percentIncrease}% in ${region}. Consider restocking.`,
    data: {},
  });
};

const notifyRestockRecommendation = async (pharmacistId, medicineName, recommendedQuantity, medicineId, pharmacyId) => {
  return notify({
    recipient: pharmacistId,
    type: "restock_recommendation",
    title: "Restock Recommended",
    message: `Based on demand trends, consider restocking ${recommendedQuantity} more units of ${medicineName}.`,
    data: { medicineId, pharmacyId },
  });
};

module.exports = {
  notify,
  notifyReservationStatus,
  notifyLowStock,
  notifyOutOfStock,
  notifyEmergencyReceived,
  notifyEmergencyAccepted,
  notifyOutbreakAlert,
  notifyRestockRecommendation,
};