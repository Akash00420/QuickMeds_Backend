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
} = require("../controllers/emergency.controller");

const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { uploadSingle } = require("../middleware/upload.middleware");

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