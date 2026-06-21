const express = require("express");
const router = express.Router();

const {
  registerPharmacy,
  getMyPharmacy,
  getPharmacyById,
  updatePharmacy,
  uploadPharmacyImages,
  uploadLicenseDocument,
  getNearbyPharmacies,
  getPharmacyMedicines,
  getAllPharmacies,
  verifyPharmacy,
  deactivatePharmacy,
} = require("../controllers/pharmacycontroller");

const { protect } = require("../middleware/authmiddleware");
const { authorize } = require("../middleware/rolemiddleware");
const { uploadSingle, uploadMultiple } = require("../middleware/upload.middleware");

// =========================
// ✅ PUBLIC ROUTES
// =========================
router.get("/nearby", getNearbyPharmacies);

// =========================
// ✅ PHARMACIST ROUTES (specific paths before dynamic :pharmacyId)
// =========================
router.post("/", protect, authorize("pharmacist"), registerPharmacy);
router.get("/me/profile", protect, authorize("pharmacist"), getMyPharmacy);

// =========================
// ✅ ADMIN ROUTES (specific paths before dynamic :pharmacyId)
// =========================
router.get("/", protect, authorize("admin"), getAllPharmacies);

// =========================
// ✅ PUBLIC ROUTES (dynamic :pharmacyId)
// =========================
router.get("/:pharmacyId", getPharmacyById);
router.get("/:pharmacyId/medicines", getPharmacyMedicines);

// =========================
// ✅ PHARMACIST ROUTES (dynamic :pharmacyId)
// =========================
router.put("/:pharmacyId", protect, authorize("pharmacist"), updatePharmacy);
router.post(
  "/:pharmacyId/images",
  protect,
  authorize("pharmacist"),
  uploadMultiple("images", 5),
  uploadPharmacyImages
);
router.post(
  "/:pharmacyId/license",
  protect,
  authorize("pharmacist"),
  uploadSingle("license"),
  uploadLicenseDocument
);

// =========================
// ✅ ADMIN ROUTES (dynamic :pharmacyId)
// =========================
router.put("/:pharmacyId/verify", protect, authorize("admin"), verifyPharmacy);
router.put("/:pharmacyId/deactivate", protect, authorize("admin"), deactivatePharmacy);

module.exports = router;