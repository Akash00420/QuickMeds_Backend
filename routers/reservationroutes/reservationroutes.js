const express = require("express");
const router = express.Router();

const {
  createReservation,
  getReservationById,
  getPharmacyReservations,
  updateReservationStatus,
  cancelReservation,
} = require("../../controllers/reservationcontroller/reservationcontroller"); // ✅ correct depth

const { protect } = require("../../middleware/authmiddleware/authmiddleware");   // ✅ fixed
const { authorize } = require("../../middleware/rolemiddleware/rolemiddleware"); // ✅ fixed
const { uploadSingle } = require("../../middleware/uploadmiddleware/uploadmiddleware"); // ✅ fixed

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

module.exports = router; // ✅ only one export at the end