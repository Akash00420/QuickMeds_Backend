// =========================
// ✅ VALIDATE MIDDLEWARE
// =========================
// Lightweight request-body validation — no external library, just
// plain checks that return a 400 with a clear message before the
// request ever reaches the controller.

// ----- Register -----
const validateRegister = (req, res, next) => {
  const { name, email, password, confirm_password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  if (confirm_password !== undefined && password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
  }

  next();
};

// ----- Login -----
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  next();
};

// ----- Pharmacy registration -----
const validatePharmacy = (req, res, next) => {
  const { name, registrationNumber, phone, address, longitude, latitude } = req.body;

  if (!name || !registrationNumber || !phone) {
    return res.status(400).json({
      success: false,
      message: "Pharmacy name, registration number, and phone are required",
    });
  }

  if (!address || !address.street || !address.city || !address.state || !address.pincode) {
    return res.status(400).json({
      success: false,
      message: "Complete address (street, city, state, pincode) is required",
    });
  }

  if (longitude === undefined || latitude === undefined) {
    return res.status(400).json({
      success: false,
      message: "Longitude and latitude are required",
    });
  }

  next();
};

// ----- Reservation creation -----
const validateReservation = (req, res, next) => {
  const { pharmacyId, items } = req.body;

  if (!pharmacyId) {
    return res.status(400).json({
      success: false,
      message: "Pharmacy ID is required",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one item is required",
    });
  }

  for (const item of items) {
    if (!item.medicineId || !item.quantity || item.quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Each item needs a valid medicineId and quantity",
      });
    }
  }

  next();
};

// ----- Emergency request creation -----
const validateEmergencyRequest = (req, res, next) => {
  const { medicineName, quantity, longitude, latitude, contactPhone } = req.body;

  if (!medicineName || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Medicine name and quantity are required",
    });
  }

  if (longitude === undefined || latitude === undefined) {
    return res.status(400).json({
      success: false,
      message: "Longitude and latitude are required",
    });
  }

  if (!contactPhone) {
    return res.status(400).json({
      success: false,
      message: "Contact phone is required",
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validatePharmacy,
  validateReservation,
  validateEmergencyRequest,
};