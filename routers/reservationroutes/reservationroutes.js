const express = require("express");
const router = express.Router();

const {
  createReservation,
  getUserReservations,
  getReservationById,
  getPharmacyReservations,
  updateReservationStatus,
  cancelReservation,
  getProfileStats, // ✅ Import add kiya
} = require("../../controllers/reservationcontroller/reservationcontroller");

const { protect } = require("../../middleware/authmiddleware/authmiddleware");
const { authorize } = require("../../middleware/rolemiddleware/rolemiddleware");
const { uploadSingle } = require("../../middleware/uploadmiddleware/uploadmiddleware");

// All reservation routes require a logged-in user
router.use(protect);

// =========================
// ✅ STATS ROUTE (Static route sabse upar hona chahiye)
// =========================
router.get("/profile-stats", getProfileStats);

// =========================
// ✅ USER ROUTES
// =========================
router.post("/", uploadSingle("prescription"), createReservation);
router.get("/", getUserReservations); 
router.patch("/:reservationId/cancel", cancelReservation);

// =========================
// ✅ PHARMACIST ROUTES
// =========================
router.get("/pharmacy", authorize("pharmacist"), getPharmacyReservations);
router.patch("/:reservationId/status", authorize("pharmacist"), updateReservationStatus);

// =========================
// ✅ SHARED (Dynamic route hamesha neeche hona chahiye)
// =========================
router.get("/:reservationId", getReservationById);

module.exports = router;