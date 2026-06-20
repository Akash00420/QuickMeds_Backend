const express = require("express");
const router = express.Router();

const {
  getProfile,
  updateProfile,
  updateAvatar,
  updateLocation,
  uploadPrescription,
  getPrescriptions,
  deletePrescription,
  getMyReservations,
  deactivateAccount,
  getAllUsers,
  toggleUserStatus,
} = require("../controllers/usercontroller");

const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { uploadSingle } = require("../middleware/upload.middleware");

// All routes below require a logged-in user
router.use(protect);

// =========================
// ✅ PROFILE
// =========================
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/avatar", uploadSingle("avatar"), updateAvatar);
router.put("/location", updateLocation);
router.put("/deactivate", deactivateAccount);

// =========================
// ✅ PRESCRIPTIONS
// =========================
router.post("/prescriptions", uploadSingle("prescription"), uploadPrescription);
router.get("/prescriptions", getPrescriptions);
router.delete("/prescriptions/:prescriptionId", deletePrescription);

// =========================
// ✅ RESERVATION HISTORY
// =========================
router.get("/reservations", getMyReservations);

// =========================
// ✅ ADMIN ONLY
// =========================
router.get("/", authorize("admin"), getAllUsers);
router.put("/:userId/toggle-status", authorize("admin"), toggleUserStatus);

module.exports = router;