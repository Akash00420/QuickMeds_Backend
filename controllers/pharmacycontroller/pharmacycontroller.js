const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");
const Medicine = require("../../models/medicineModel/medicineModel");
const Notification = require("../../models/notificationModel/notificationModel");
const cloudinary = require("../../config/cloudinary");
const asyncHandler = require("../../utils/asyncHandler");
const apiResponse = require("../../utils/apiResponse");
const calculateDistance = require("../../utils/calculateDistance");

// =========================
// ✅ REGISTER PHARMACY
// =========================
// POST /api/pharmacies   (pharmacist only)
const registerPharmacy = asyncHandler(async (req, res) => {
  const {
    name,
    registrationNumber,
    phone,
    email,
    address,
    longitude,
    latitude,
    operatingHours,
    isOpen24Hours,
  } = req.body;

  const existing = await Pharmacy.findOne({ registrationNumber });
  if (existing) return apiResponse.error(res, "Registration number already in use", 409);

  const pharmacy = await Pharmacy.create({
    owner: req.user._id,
    name,
    registrationNumber,
    phone,
    email,
    address,
    location: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    operatingHours,
    isOpen24Hours,
  });

  return apiResponse.success(
    res,
    { pharmacy },
    "Pharmacy registered. Awaiting admin verification.",
    201
  );
});

// =========================
// ✅ GET MY PHARMACY (pharmacist)
// =========================
// GET /api/pharmacies/me
const getMyPharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) return apiResponse.error(res, "No pharmacy found for this account", 404);

  return apiResponse.success(res, { pharmacy }, "Pharmacy fetched");
});

// =========================
// ✅ GET PHARMACY BY ID
// =========================
// GET /api/pharmacies/:pharmacyId
const getPharmacyById = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.pharmacyId);
  if (!pharmacy) return apiResponse.error(res, "Pharmacy not found", 404);

  return apiResponse.success(res, { pharmacy }, "Pharmacy fetched");
});

// =========================
// ✅ UPDATE PHARMACY DETAILS
// =========================
// PUT /api/pharmacies/:pharmacyId   (owner only)
const updatePharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.pharmacyId);
  if (!pharmacy) return apiResponse.error(res, "Pharmacy not found", 404);

  if (pharmacy.owner.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized to update this pharmacy", 403);
  }

  const allowedFields = [
    "name",
    "phone",
    "email",
    "address",
    "operatingHours",
    "isOpen24Hours",
    "acceptsEmergencyRequests",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) pharmacy[field] = req.body[field];
  });

  if (req.body.longitude !== undefined && req.body.latitude !== undefined) {
    pharmacy.location = {
      type: "Point",
      coordinates: [req.body.longitude, req.body.latitude],
    };
  }

  await pharmacy.save();

  return apiResponse.success(res, { pharmacy }, "Pharmacy updated successfully");
});

// =========================
// ✅ UPLOAD PHARMACY IMAGES
// =========================
// POST /api/pharmacies/:pharmacyId/images   (owner only)
const uploadPharmacyImages = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.pharmacyId);
  if (!pharmacy) return apiResponse.error(res, "Pharmacy not found", 404);

  if (pharmacy.owner.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized", 403);
  }

  if (!req.files || req.files.length === 0) {
    return apiResponse.error(res, "No images provided", 400);
  }

  const uploaded = [];
  for (const file of req.files) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "quickmeds/pharmacies",
    });
    uploaded.push({ url: result.secure_url, publicId: result.public_id });
  }

  pharmacy.images.push(...uploaded);
  await pharmacy.save();

  return apiResponse.success(res, { images: pharmacy.images }, "Images uploaded successfully");
});

// =========================
// ✅ UPLOAD LICENSE DOCUMENT
// =========================
// POST /api/pharmacies/:pharmacyId/license   (owner only)
const uploadLicenseDocument = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.pharmacyId);
  if (!pharmacy) return apiResponse.error(res, "Pharmacy not found", 404);

  if (pharmacy.owner.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized", 403);
  }

  if (!req.file) return apiResponse.error(res, "No document provided", 400);

  if (pharmacy.licenseDocument?.publicId) {
    await cloudinary.uploader.destroy(pharmacy.licenseDocument.publicId).catch(() => {});
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "quickmeds/licenses",
    resource_type: "auto",
  });

  pharmacy.licenseDocument = { url: result.secure_url, publicId: result.public_id };
  // Re-upload of license resets verification — admin must re-check
  pharmacy.isVerified = false;
  await pharmacy.save();

  return apiResponse.success(res, { pharmacy }, "License document uploaded. Pending re-verification.");
});

// =========================
// ✅ NEARBY PHARMACIES
// =========================
// GET /api/pharmacies/nearby?longitude=&latitude=&radius=5
const getNearbyPharmacies = asyncHandler(async (req, res) => {
  const { longitude, latitude, radius = 5 } = req.query;

  if (!longitude || !latitude) {
    return apiResponse.error(res, "Longitude and latitude are required", 400);
  }

  const pharmacies = await Pharmacy.find({
    isVerified: true,
    isActive: true,
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
        $maxDistance: Number(radius) * 1000, // km → meters
      },
    },
  });

  const withDistance = pharmacies.map((p) => ({
    ...p.toObject(),
    distanceKm: calculateDistance(
      Number(latitude),
      Number(longitude),
      p.location.coordinates[1],
      p.location.coordinates[0]
    ),
  }));

  return apiResponse.success(res, { pharmacies: withDistance }, "Nearby pharmacies fetched");
});

// =========================
// ✅ GET PHARMACY'S MEDICINES
// =========================
// GET /api/pharmacies/:pharmacyId/medicines
const getPharmacyMedicines = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({
    pharmacy: req.params.pharmacyId,
    isAvailable: true,
  }).sort({ name: 1 });

  return apiResponse.success(res, { medicines }, "Pharmacy medicines fetched");
});

// =========================
// ✅ ADMIN: GET ALL PHARMACIES
// =========================
// GET /api/pharmacies   (admin only)
const getAllPharmacies = asyncHandler(async (req, res) => {
  const { isVerified, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (isVerified !== undefined) filter.isVerified = isVerified === "true";

  const pharmacies = await Pharmacy.find(filter)
    .populate("owner", "name email phone")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Pharmacy.countDocuments(filter);

  return apiResponse.success(res, { pharmacies, total, page: Number(page) }, "Pharmacies fetched");
});

// =========================
// ✅ ADMIN: VERIFY / APPROVE PHARMACY
// =========================
// PUT /api/pharmacies/:pharmacyId/verify   (admin only)
const verifyPharmacy = asyncHandler(async (req, res) => {
  console.log("STEP 1: entered verifyPharmacy");

  const { approve } = req.body; // true | false
  console.log("STEP 2: approve =", approve);

  const pharmacy = await Pharmacy.findById(req.params.pharmacyId);
  console.log("STEP 3: pharmacy found =", !!pharmacy);
  if (!pharmacy) return apiResponse.error(res, "Pharmacy not found", 404);

  pharmacy.isVerified = !!approve;
  await pharmacy.save();
  console.log("STEP 4: pharmacy saved, isVerified =", pharmacy.isVerified);

  console.log("STEP 4.5: about to create notification");
  try {
    await Notification.create({
      recipient: pharmacy.owner,
      type: approve ? "pharmacy_approved" : "pharmacy_rejected",
      title: approve ? "Pharmacy Approved" : "Pharmacy Verification Rejected",
      message: approve
        ? `Congratulations! ${pharmacy.name} has been verified and is now live on QuickMeds.`
        : `Your pharmacy ${pharmacy.name} could not be verified. Please check your documents and try again.`,
      data: { pharmacyId: pharmacy._id },
    });
  } catch (notifErr) {
    console.log("NOTIFICATION CREATE FAILED:", notifErr);
    throw notifErr;
  }
  console.log("STEP 5: notification created");

  return apiResponse.success(res, { pharmacy }, "Pharmacy verification status updated");
});

// =========================
// ✅ ADMIN: DEACTIVATE PHARMACY
// =========================
// PUT /api/pharmacies/:pharmacyId/deactivate   (admin only)
const deactivatePharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findByIdAndUpdate(
    req.params.pharmacyId,
    { isActive: false },
    { new: true }
  );

  if (!pharmacy) return apiResponse.error(res, "Pharmacy not found", 404);

  return apiResponse.success(res, { pharmacy }, "Pharmacy deactivated");
});

module.exports = {
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
};