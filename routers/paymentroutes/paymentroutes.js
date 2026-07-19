const express = require("express");
const router = express.Router();

// Controllers import karein
const {
  createMedicineOrder,
  verifyMedicinePayment,
} = require("../../controllers/paymentController/paymentController");

// Middleware import karein
// const { isAuthenticatedUser } = require("../middleware/auth");

// ─── USER ROUTES ───
// Medicine order create karna (Free delivery logic isme run hoga)
router.post(
  "/order/create", 
  // isAuthenticatedUser, 
  createMedicineOrder
);

// Medicine ka payment verify karna
router.post(
  "/order/verify", 
  // isAuthenticatedUser, 
  verifyMedicinePayment
);

module.exports = router;