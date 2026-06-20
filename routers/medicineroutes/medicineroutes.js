const express = require("express");
const router = express.Router();

const {
  searchMedicineNearby,
  suggestMedicines,
  getMedicineById,
  addMedicine,
  bulkAddMedicines,
  updateMedicine,
  updateStock,
  uploadMedicineImage,
  deleteMedicine,
  getLowStockMedicines,
  getExpiringMedicines,
} = require("../controllers/medicine.controller");

const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { uploadSingle } = require("../middleware/upload.middleware");

// =========================
// ✅ PUBLIC SEARCH ROUTES
// =========================
router.get("/search", searchMedicineNearby);
router.get("/suggest", suggestMedicines);

// =========================
// ✅ PHARMACIST ROUTES (specific paths before dynamic :medicineId)
// =========================
router.get("/low-stock", protect, authorize("pharmacist"), getLowStockMedicines);
router.get("/expiring", protect, authorize("pharmacist"), getExpiringMedicines);
router.post("/", protect, authorize("pharmacist"), addMedicine);
router.post("/bulk", protect, authorize("pharmacist"), bulkAddMedicines);

// =========================
// ✅ DYNAMIC :medicineId ROUTES
// =========================
router.get("/:medicineId", getMedicineById);
router.put("/:medicineId", protect, authorize("pharmacist"), updateMedicine);
router.patch("/:medicineId/stock", protect, authorize("pharmacist"), updateStock);
router.post(
  "/:medicineId/image",
  protect,
  authorize("pharmacist"),
  uploadSingle("image"),
  uploadMedicineImage
);
router.delete("/:medicineId", protect, authorize("pharmacist"), deleteMedicine);

module.exports = router;