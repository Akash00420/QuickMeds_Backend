const express = require("express");
const router = express.Router();

const {
  createEmergencyRequest,
  getMyEmergencyRequests,
  getEmergencyRequestById,
  getIncomingEmergencyRequests,
  respondToEmergencyRequest,
  fulfillEmergencyRequest,
  cancelEmergencyRequest,
} = require("../../controllers/emergencycontroller/emergencycontroller"); // ✅ fixed

const { protect } = require("../../middleware/authmiddleware/authmiddleware");     // ✅ fixed
const { authorize } = require("../../middleware/rolemiddleware/rolemiddleware");   // ✅ fixed
const { uploadSingle } = require("../../middleware/uploadmiddleware/uploadmiddleware"); // ✅ fixed

// All emergency routes require a logged-in user
router.use(protect);

// =========================
// ✅ USER ROUTES
// =========================
router.post("/", uploadSingle("prescription"), createEmergencyRequest);
router.get("/my-requests", getMyEmergencyRequests);
router.patch("/:requestId/cancel", cancelEmergencyRequest);

// =========================
// ✅ PHARMACIST ROUTES
// =========================
router.get("/pharmacy/incoming", authorize("pharmacist"), getIncomingEmergencyRequests);
router.patch("/:requestId/respond", authorize("pharmacist"), respondToEmergencyRequest);
router.patch("/:requestId/fulfill", authorize("pharmacist"), fulfillEmergencyRequest);

// =========================
// ✅ SHARED (authorization checked in controller / open data)
// =========================
router.get("/:requestId", getEmergencyRequestById);

module.exports = router;