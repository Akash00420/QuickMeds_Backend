const EmergencyRequest = require("../../models/emergencyRequestModel/emergencyRequestModel");
const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");
const Notification = require("../../models/notificationModel/notificationModel");
const cloudinary = require("../../config/cloudinary");
const asyncHandler = require("../../utils/asyncHandler");
const apiResponse = require("../../utils/apiResponse");

// =========================
// ✅ CREATE EMERGENCY REQUEST
// =========================
// POST /api/emergency
const createEmergencyRequest = asyncHandler(async (req, res) => {
  console.log("BODY RAW:", req.body);

  // ✅ Trim all keys and values from form-data (fixes stray spaces from Postman)
  const body = {};
  for (const key of Object.keys(req.body)) {
    body[key.trim()] = typeof req.body[key] === "string"
      ? req.body[key].trim()
      : req.body[key];
  }

  console.log("BODY CLEANED:", body);

  const {
    medicineName,
    quantity,
    urgencyLevel,
    longitude,
    latitude,
    address,
    contactPhone,
    notes,
    broadcastRadius,
  } = body;

  // ✅ Parse numbers (form-data sends everything as strings)
  const lng = parseFloat(longitude);
  const lat = parseFloat(latitude);
  const qty = parseInt(quantity);
  const radius = parseFloat(broadcastRadius) || 5;

  // ✅ Debug parsed values
  console.log("PARSED VALUES:", { lng, lat, qty, radius, medicineName, contactPhone });

  // ✅ Validate required fields
  if (!medicineName || !qty || isNaN(lng) || isNaN(lat) || !contactPhone) {
    console.log("❌ VALIDATION FAILED:", {
      medicineName: !!medicineName,
      qty: !!qty,
      lng: !isNaN(lng),
      lat: !isNaN(lat),
      contactPhone: !!contactPhone,
    });
    return apiResponse.error(res, "Missing required emergency request fields", 400);
  }

  // ✅ Validate coordinate ranges
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return apiResponse.error(res, "Invalid longitude or latitude values", 400);
  }

  // ✅ Upload prescription to Cloudinary if provided
  let prescription = { url: null, publicId: null };
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "quickmeds/emergency-prescriptions",
      resource_type: "auto",
    });
    prescription = { url: result.secure_url, publicId: result.public_id };
  }

  // ✅ Create emergency request
  const emergencyRequest = await EmergencyRequest.create({
    requestedBy: req.user._id,
    medicineName,
    quantity: qty,
    urgencyLevel: urgencyLevel || "high",
    location: { type: "Point", coordinates: [lng, lat] },
    address: address || "",
    contactPhone,
    notes: notes || "",
    prescription,
    broadcastRadius: radius,
  });

  // ✅ Find nearby verified pharmacies that accept emergency requests
  const nearbyPharmacies = await Pharmacy.find({
    isVerified: true,
    isActive: true,
    acceptsEmergencyRequests: true,
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radius * 1000,
      },
    },
  });

  console.log("NEARBY PHARMACIES FOUND:", nearbyPharmacies.length);

  // ✅ Add pharmacy response entries
  emergencyRequest.pharmacyResponses = nearbyPharmacies.map((p) => ({
    pharmacy: p._id,
    status: "notified",
  }));
  await emergencyRequest.save();

  // ✅ Notify each nearby pharmacy (real-time + persisted)
  const io = req.app.get("io");
  for (const pharmacy of nearbyPharmacies) {
    await Notification.create({
      recipient: pharmacy.owner,
      type: "emergency_request_received",
      title: "🚨 Emergency Medicine Request",
      message: `Urgent request for ${qty} unit(s) of ${medicineName} nearby. Urgency: ${urgencyLevel || "high"}.`,
      data: {
        emergencyRequestId: emergencyRequest._id,
        pharmacyId: pharmacy._id,
      },
    });

    if (io) {
      io.to(`pharmacy:${pharmacy._id}`).emit("emergency:new_request", {
        emergencyRequestId: emergencyRequest._id,
        medicineName,
        quantity: qty,
        urgencyLevel: urgencyLevel || "high",
        location: emergencyRequest.location,
      });
    }
  }

  return apiResponse.success(
    res,
    { emergencyRequest, notifiedCount: nearbyPharmacies.length },
    "Emergency request broadcast to nearby pharmacies",
    201
  );
});

// =========================
// ✅ GET MY EMERGENCY REQUESTS (user)
// =========================
// GET /api/emergency/my-requests
const getMyEmergencyRequests = asyncHandler(async (req, res) => {
  const requests = await EmergencyRequest.find({ requestedBy: req.user._id })
    .populate("fulfilledBy", "name address phone")
    .sort({ createdAt: -1 });

  return apiResponse.success(res, { requests }, "Emergency requests fetched");
});

// =========================
// ✅ GET EMERGENCY REQUEST BY ID
// =========================
// GET /api/emergency/:requestId
const getEmergencyRequestById = asyncHandler(async (req, res) => {
  const request = await EmergencyRequest.findById(req.params.requestId)
    .populate("requestedBy", "name phone")
    .populate("pharmacyResponses.pharmacy", "name address phone location")
    .populate("fulfilledBy", "name address phone");

  if (!request) return apiResponse.error(res, "Emergency request not found", 404);

  return apiResponse.success(res, { request }, "Emergency request fetched");
});

// =========================
// ✅ GET INCOMING REQUESTS (pharmacist)
// =========================
// GET /api/emergency/pharmacy/incoming
const getIncomingEmergencyRequests = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) return apiResponse.error(res, "No pharmacy linked to this account", 404);

  const requests = await EmergencyRequest.find({
    "pharmacyResponses.pharmacy": pharmacy._id,
    status: { $in: ["open", "responded"] },
  })
    .populate("requestedBy", "name phone")
    .sort({ createdAt: -1 });

  return apiResponse.success(res, { requests }, "Incoming emergency requests fetched");
});

// =========================
// ✅ RESPOND TO EMERGENCY REQUEST (pharmacist)
// =========================
// PATCH /api/emergency/:requestId/respond
const respondToEmergencyRequest = asyncHandler(async (req, res) => {
  const { response, message } = req.body;

  if (!["accepted", "rejected"].includes(response)) {
    return apiResponse.error(res, "Response must be 'accepted' or 'rejected'", 400);
  }

  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) return apiResponse.error(res, "No pharmacy linked to this account", 404);

  const request = await EmergencyRequest.findById(req.params.requestId);
  if (!request) return apiResponse.error(res, "Emergency request not found", 404);

  if (request.status === "fulfilled" || request.status === "cancelled") {
    return apiResponse.error(res, `Cannot respond to a ${request.status} request`, 400);
  }

  const entry = request.pharmacyResponses.find(
    (r) => r.pharmacy.toString() === pharmacy._id.toString()
  );
  if (!entry) {
    return apiResponse.error(res, "This pharmacy was not notified for this request", 403);
  }

  entry.status = response;
  entry.message = message || "";
  entry.respondedAt = new Date();

  if (response === "accepted" && request.status === "open") {
    request.status = "responded";
  }

  await request.save();

  if (response === "accepted") {
    await Notification.create({
      recipient: request.requestedBy,
      type: "emergency_request_accepted",
      title: "✅ Pharmacy Responded",
      message: `${pharmacy.name} can fulfill your emergency request for ${request.medicineName}.`,
      data: {
        emergencyRequestId: request._id,
        pharmacyId: pharmacy._id,
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${request.requestedBy}`).emit("emergency:pharmacy_accepted", {
        emergencyRequestId: request._id,
        pharmacy: {
          id: pharmacy._id,
          name: pharmacy.name,
          phone: pharmacy.phone,
        },
      });
    }
  }

  return apiResponse.success(res, { request }, "Response recorded");
});

// =========================
// ✅ MARK EMERGENCY REQUEST FULFILLED (pharmacist)
// =========================
// PATCH /api/emergency/:requestId/fulfill
const fulfillEmergencyRequest = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) return apiResponse.error(res, "No pharmacy linked to this account", 404);

  const request = await EmergencyRequest.findById(req.params.requestId);
  if (!request) return apiResponse.error(res, "Emergency request not found", 404);

  if (request.status === "fulfilled") {
    return apiResponse.error(res, "Request already fulfilled", 400);
  }

  if (request.status === "cancelled") {
    return apiResponse.error(res, "Cannot fulfill a cancelled request", 400);
  }

  request.status = "fulfilled";
  request.fulfilledBy = pharmacy._id;
  request.fulfilledAt = new Date();

  const entry = request.pharmacyResponses.find(
    (r) => r.pharmacy.toString() === pharmacy._id.toString()
  );
  if (entry) entry.status = "fulfilled";

  await request.save();

  await Notification.create({
    recipient: request.requestedBy,
    type: "emergency_request_fulfilled",
    title: "✅ Emergency Request Fulfilled",
    message: `Your emergency request for ${request.medicineName} has been fulfilled by ${pharmacy.name}.`,
    data: {
      emergencyRequestId: request._id,
      pharmacyId: pharmacy._id,
    },
  });

  return apiResponse.success(res, { request }, "Emergency request marked as fulfilled");
});

// =========================
// ✅ CANCEL EMERGENCY REQUEST (user)
// =========================
// PATCH /api/emergency/:requestId/cancel
const cancelEmergencyRequest = asyncHandler(async (req, res) => {
  const request = await EmergencyRequest.findById(req.params.requestId);
  if (!request) return apiResponse.error(res, "Emergency request not found", 404);

  if (request.requestedBy.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized to cancel this request", 403);
  }

  if (request.status === "fulfilled") {
    return apiResponse.error(res, "Cannot cancel an already fulfilled request", 400);
  }

  if (request.status === "cancelled") {
    return apiResponse.error(res, "Request is already cancelled", 400);
  }

  request.status = "cancelled";
  await request.save();

  return apiResponse.success(res, { request }, "Emergency request cancelled");
});

module.exports = {
  createEmergencyRequest,
  getMyEmergencyRequests,
  getEmergencyRequestById,
  getIncomingEmergencyRequests,
  respondToEmergencyRequest,
  fulfillEmergencyRequest,
  cancelEmergencyRequest,
};