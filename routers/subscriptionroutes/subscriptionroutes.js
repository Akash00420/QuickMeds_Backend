const express = require("express");
const router = express.Router();

// 1. Import Controller
const subscriptionController = require("../../controllers/subscriptioncontroller/subscriptioncontroller");

// 2. Import Auth Middleware (correct path — same as every other route file)
const { protect } = require("../../middleware/authmiddleware/authmiddleware");

// ─── USER ROUTES ───
// POST /api/subscription/create
router.post("/create", protect, subscriptionController.createSubscription);

// POST /api/subscription/verify
router.post("/verify", protect, subscriptionController.verifySubscriptionPayment);

// ─── ADMIN ROUTES ───
// GET /api/subscription/admin/subscriptions
router.get("/admin/subscriptions", protect, subscriptionController.getAllSubscriptions);

module.exports = router;
