const express = require("express");
const router = express.Router();

const {
  createReservation,
  getReservationById,
  getPharmacyReservations,
  updateReservationStatus,
  cancelReservation,
} = require("../controllers/reservation.controller");

const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { uploadSingle } = require("../middleware/upload.middleware");

// All reservation routes require a logged-in user
router.use(protect);

// =========================
// ✅ USER ROUTES
// =========================
router.post("/", uploadSingle("prescription"), createReservation);
router.patch("/:reservationId/cancel", cancelReservation);

// =========================
// ✅ PHARMACIST ROUTES
// =========================
router.get("/pharmacy", authorize("pharmacist"), getPharmacyReservations);
router.patch("/:reservationId/status", authorize("pharmacist"), updateReservationStatus);

// =========================
// ✅ SHARED (user / pharmacist / admin — authorization checked in controller)
// =========================
router.get("/:reservationId", getReservationById);

module.exports = router;