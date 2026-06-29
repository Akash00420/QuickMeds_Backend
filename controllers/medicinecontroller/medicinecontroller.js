const medicineService = require("../../services/medicineservice/medicineservice");
const Medicine = require("../../models/medicineModel/medicineModel");
const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");
const Notification = require("../../models/notificationModel/notificationModel");
const cloudinary = require("../../config/cloudinary");
const asyncHandler = require("../../utils/asyncHandler");
const apiResponse = require("../../utils/apiResponse");
const calculateDistance = require("../../utils/calculateDistance");

// =========================
// ✅ SEARCH MEDICINE NEARBY  (core QuickMeds search)
// =========================
// GET /api/medicines/search?name=paracetamol&longitude=&latitude=&radius=5
const searchMedicineNearby = asyncHandler(async (req, res) => {
  const { name, longitude, latitude, radius = 5 } = req.query;

  if (!name) return apiResponse.error(res, "Medicine name is required", 400);
  if (!longitude || !latitude) {
    return apiResponse.error(res, "Longitude and latitude are required", 400);
  }

  const results = await medicineService.findNearbyStock({
    name,
    longitude: Number(longitude),
    latitude: Number(latitude),
    radiusKm: Number(radius),
  });

  return apiResponse.success(res, { results }, "Search results fetched");
});

// =========================
// ✅ AUTOCOMPLETE / SUGGESTIONS
// =========================
// GET /api/medicines/suggest?q=para
const suggestMedicines = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return apiResponse.success(res, { suggestions: [] }, "OK");

  const suggestions = await Medicine.find({
    $text: { $search: q },
    isAvailable: true,
  })
    .select("name genericName brand strength")
    .limit(10);

  // De-duplicate by name
  const unique = [...new Map(suggestions.map((m) => [m.name.toLowerCase(), m])).values()];

  return apiResponse.success(res, { suggestions: unique }, "Suggestions fetched");
});

// =========================
// ✅ GET MEDICINE BY ID
// =========================
// GET /api/medicines/:medicineId
const getMedicineById = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.medicineId).populate(
    "pharmacy",
    "name address location phone"
  );

  if (!medicine) return apiResponse.error(res, "Medicine not found", 404);

  return apiResponse.success(res, { medicine }, "Medicine fetched");
});

// =========================
// ✅ ADD MEDICINE  (pharmacist)
// =========================
// POST /api/medicines
const addMedicine = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) return apiResponse.error(res, "No pharmacy linked to this account", 404);

  const medicine = await Medicine.create({
    ...req.body,
    pharmacy: pharmacy._id,
    stockLastUpdatedBy: req.user._id,
  });

  await Pharmacy.findByIdAndUpdate(pharmacy._id, { $inc: { medicineCount: 1 } });

  return apiResponse.success(res, { medicine }, "Medicine added successfully", 201);
});

// =========================
// ✅ BULK ADD MEDICINES  (pharmacist — e.g. CSV import)
// =========================
// POST /api/medicines/bulk
const bulkAddMedicines = asyncHandler(async (req, res) => {
  const { medicines } = req.body; // array of medicine objects

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return apiResponse.error(res, "Medicines array is required", 400);
  }

  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) return apiResponse.error(res, "No pharmacy linked to this account", 404);

  const docs = medicines.map((m) => ({
    ...m,
    pharmacy: pharmacy._id,
    stockLastUpdatedBy: req.user._id,
  }));

  const created = await Medicine.insertMany(docs);

  await Pharmacy.findByIdAndUpdate(pharmacy._id, { $inc: { medicineCount: created.length } });

  return apiResponse.success(res, { count: created.length }, "Medicines imported successfully", 201);
});

// =========================
// ✅ UPDATE MEDICINE DETAILS  (pharmacist)
// =========================
// PUT /api/medicines/:medicineId
const updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.medicineId).populate("pharmacy");
  if (!medicine) return apiResponse.error(res, "Medicine not found", 404);

  if (medicine.pharmacy.owner.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized to edit this medicine", 403);
  }

  const restrictedFields = ["pharmacy", "totalSold"];
  Object.keys(req.body).forEach((key) => {
    if (!restrictedFields.includes(key)) medicine[key] = req.body[key];
  });

  medicine.stockLastUpdatedBy = req.user._id;
  await medicine.save();

  return apiResponse.success(res, { medicine }, "Medicine updated successfully");
});

// =========================
// ✅ UPDATE STOCK QUANTITY  (pharmacist — live stock updates)
// =========================
// PATCH /api/medicines/:medicineId/stock
const updateStock = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  if (quantity === undefined || quantity < 0) {
    return apiResponse.error(res, "Valid quantity is required", 400);
  }

  const medicine = await Medicine.findById(req.params.medicineId).populate("pharmacy");
  if (!medicine) return apiResponse.error(res, "Medicine not found", 404);

  if (medicine.pharmacy.owner.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized to update this medicine", 403);
  }

  medicine.quantity = quantity;
  medicine.stockLastUpdatedBy = req.user._id;
  await medicine.save();

  // Emit real-time update to anyone watching this medicine's stock
  const io = req.app.get("io");
  if (io) {
    io.to(`medicine:${medicine._id}`).emit("stock:updated", {
      medicineId: medicine._id,
      pharmacyId: medicine.pharmacy._id,
      quantity: medicine.quantity,
      stockStatus: medicine.stockStatus,
    });
  }

  // Low stock notification to the pharmacist
  if (medicine.quantity === 0) {
    await Notification.create({
      recipient: medicine.pharmacy.owner,
      type: "out_of_stock_alert",
      title: "Out of Stock",
      message: `${medicine.name} is now out of stock at ${medicine.pharmacy.name}.`,
      data: { medicineId: medicine._id, pharmacyId: medicine.pharmacy._id },
    });
  } else if (medicine.quantity <= medicine.lowStockThreshold) {
    await Notification.create({
      recipient: medicine.pharmacy.owner,
      type: "low_stock_alert",
      title: "Low Stock Alert",
      message: `${medicine.name} is running low (${medicine.quantity} ${medicine.unit} left) at ${medicine.pharmacy.name}.`,
      data: { medicineId: medicine._id, pharmacyId: medicine.pharmacy._id },
    });
  }

  return apiResponse.success(res, { medicine }, "Stock updated successfully");
});

// =========================
// ✅ UPLOAD MEDICINE IMAGE  (pharmacist)
// =========================
// POST /api/medicines/:medicineId/image
const uploadMedicineImage = asyncHandler(async (req, res) => {
  if (!req.file) return apiResponse.error(res, "No image provided", 400);

  const medicine = await Medicine.findById(req.params.medicineId).populate("pharmacy");
  if (!medicine) return apiResponse.error(res, "Medicine not found", 404);

  if (medicine.pharmacy.owner.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized", 403);
  }

  if (medicine.image?.publicId) {
    await cloudinary.uploader.destroy(medicine.image.publicId).catch(() => {});
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "quickmeds/medicines",
  });

  medicine.image = { url: result.secure_url, publicId: result.public_id };
  await medicine.save();

  return apiResponse.success(res, { medicine }, "Medicine image uploaded");
});

// =========================
// ✅ DELETE MEDICINE  (pharmacist)
// =========================
// DELETE /api/medicines/:medicineId
const deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.medicineId).populate("pharmacy");
  if (!medicine) return apiResponse.error(res, "Medicine not found", 404);

  if (medicine.pharmacy.owner.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized to delete this medicine", 403);
  }

  if (medicine.image?.publicId) {
    await cloudinary.uploader.destroy(medicine.image.publicId).catch(() => {});
  }

  await medicine.deleteOne();
  await Pharmacy.findByIdAndUpdate(medicine.pharmacy._id, { $inc: { medicineCount: -1 } });

  return apiResponse.success(res, null, "Medicine deleted successfully");
});

// =========================
// ✅ GET LOW STOCK MEDICINES  (pharmacist dashboard)
// =========================
// GET /api/medicines/low-stock
const getLowStockMedicines = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) return apiResponse.error(res, "No pharmacy linked to this account", 404);

  const medicines = await Medicine.find({
    pharmacy: pharmacy._id,
    $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
  }).sort({ quantity: 1 });

  return apiResponse.success(res, { medicines }, "Low stock medicines fetched");
});

// =========================
// ✅ GET EXPIRING MEDICINES  (pharmacist dashboard)
// =========================
// GET /api/medicines/expiring?days=30
const getExpiringMedicines = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) return apiResponse.error(res, "No pharmacy linked to this account", 404);

  const cutoff = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

  const medicines = await Medicine.find({
    pharmacy: pharmacy._id,
    expiryDate: { $ne: null, $lte: cutoff },
  }).sort({ expiryDate: 1 });

  return apiResponse.success(res, { medicines }, "Expiring medicines fetched");
});

module.exports = {
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
};