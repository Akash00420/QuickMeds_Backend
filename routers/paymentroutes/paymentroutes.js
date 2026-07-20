const express = require("express");
const router = express.Router();

// Controllers import karein
const {
  createMedicineOrder,
  verifyMedicinePayment,
} = require("../../controllers/paymentController/paymentController");

// ✅ Auth Middleware se sahi function 'protect' ko import karein
const { protect } = require("../../middleware/authmiddleware/authmiddleware");

// ─── USER ROUTES ───

// Medicine order create karna (Free delivery logic isme run hoga)
router.post(
  "/order/create", 
  protect, 
  createMedicineOrder
);

// Medicine ka payment verify karna
router.post(
  "/order/verify", 
  protect, 
  verifyMedicinePayment
);

module.exports = router;