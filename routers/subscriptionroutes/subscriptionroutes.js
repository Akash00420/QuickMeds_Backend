const express = require("express");
const router = express.Router();

// Controllers import karein (Apne path ke hisaab se adjust kar lein)
const {
  createSubscription,
  verifySubscriptionPayment,
  getAllSubscriptions,
} = require("../../controllers/subscriptioncontroller/subscriptioncontroller");

// Middleware import karein (Apne auth middleware ka path dein)
// const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

// ─── USER ROUTES ───
// Subscription kharidne ke liye order create karna
router.post(
  "/subscription/create", 
  // isAuthenticatedUser, // User login hona zaroori hai
  createSubscription
);

// Payment successful hone par verify karna
router.post(
  "/subscription/verify", 
  // isAuthenticatedUser, 
  verifySubscriptionPayment
);

// ─── ADMIN ROUTES ───
// Admin dashboard ke liye saari subscriptions dekhna
router.get(
  "/admin/subscriptions", 
  // isAuthenticatedUser, 
  // authorizeRoles("admin"), // Sirf admin access kar paye
  getAllSubscriptions
);

module.exports = router;