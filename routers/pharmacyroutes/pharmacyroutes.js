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
  getAllVendors,
  toggleVendorActive,
  createVendorDirectly,
} = require("../../controllers/pharmacycontroller/pharmacycontroller");

const { protect } = require("../../middleware/authmiddleware/authmiddleware");
const { authorize } = require("../../middleware/rolemiddleware/rolemiddleware");
const { uploadSingle, uploadMultiple } = require("../../middleware/uploadmiddleware/uploadmiddleware");

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
// ✅ ADMIN + SUPERADMIN ROUTES (specific paths before dynamic :pharmacyId)
// =========================
router.get("/", protect, authorize("admin", "superadmin"), getAllPharmacies);
router.get("/admin/vendors", protect, authorize("admin", "superadmin"), getAllVendors);
router.post("/admin/vendors", protect, authorize("admin", "superadmin"), createVendorDirectly);

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
// ✅ ADMIN + SUPERADMIN ROUTES (dynamic :pharmacyId)
// =========================
router.put("/:pharmacyId/verify", protect, authorize("admin", "superadmin"), verifyPharmacy);
router.put("/:pharmacyId/deactivate", protect, authorize("admin", "superadmin"), deactivatePharmacy);
router.patch("/:pharmacyId/toggle-active", protect, authorize("admin", "superadmin"), toggleVendorActive);

module.exports = router;