const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../../middleware/authmiddleware/authmiddleware");
const loginController = require("../../controllers/logincontroller/logincontroller");
const {
  getDashboardStats,
  getAllUsers,
  getSubscribedUsers,
  getUserById,
  toggleSubscription,
  toggleActiveStatus,
  deleteUser,
} = require("../../controllers/admincontroller/admincontroller");

// ── PUBLIC ROUTE — must come BEFORE the protect middleware below ──
router.post("/login", loginController.createLogin);

// ── Everything below this line requires a valid admin token ──
router.use(protect, adminOnly);

router.get("/stats",                               getDashboardStats);
router.get("/users",                               getAllUsers);
router.get("/users/subscribed",                    getSubscribedUsers);
router.get("/users/:userId",                       getUserById);
router.patch("/users/:userId/toggle-subscription", toggleSubscription);
router.patch("/users/:userId/toggle-active",       toggleActiveStatus);
router.delete("/users/:userId",                    deleteUser);

module.exports = router;