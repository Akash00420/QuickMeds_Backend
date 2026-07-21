const express = require("express");
const router = express.Router();

const {
  searchMedicineNearby,
  suggestMedicines,
  getAllMedicines,
  getMedicineById,
  addMedicine,
  bulkAddMedicines,
  updateMedicine,
  updateStock,
  uploadMedicineImage,
  deleteMedicine,
  getLowStockMedicines,
  getExpiringMedicines,
} = require("../../controllers/medicinecontroller/medicinecontroller");

const { protect } = require("../../middleware/authmiddleware/authmiddleware");
const { authorize } = require("../../middleware/rolemiddleware/rolemiddleware");
const { uploadSingle } = require("../../middleware/uploadmiddleware/uploadmiddleware");

// =========================
// ✅ PUBLIC SEARCH ROUTES
// =========================
router.get("/search", searchMedicineNearby);
router.get("/suggest", suggestMedicines);
router.get("/all", getAllMedicines);

// =========================
// ✅ PHARMACIST ROUTES (specific paths before dynamic :medicineId)
// =========================
router.get("/low-stock", protect, authorize("pharmacist"), getLowStockMedicines);
router.get("/expiring", protect, authorize("pharmacist"), getExpiringMedicines);

// 💊 Add Medicine (supports single image upload)
router.post(
  "/",
  protect,
  authorize("pharmacist"),
  uploadSingle("image"), // 👈 Added upload middleware here
  addMedicine
);

router.post("/bulk", protect, authorize("pharmacist"), bulkAddMedicines);

// =========================
// ✅ DYNAMIC :medicineId ROUTES
// =========================
router.get("/:medicineId", getMedicineById);

// ✏️ Update Medicine (supports updating image as well)
router.put(
  "/:medicineId",
  protect,
  authorize("pharmacist"),
  uploadSingle("image"), // 👈 Added upload middleware here
  updateMedicine
);

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