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
  createVendor,
  getAllVendorsAdmin,
  getVendorByIdAdmin,
  toggleVendorActive,
  deleteVendor,
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

// ── Vendor management (direct-create, no approval flow) ──
router.post("/vendors",                          createVendor);
router.get("/vendors",                           getAllVendorsAdmin);
router.get("/vendors/:vendorId",                 getVendorByIdAdmin);
router.patch("/vendors/:vendorId/toggle-active", toggleVendorActive);
router.delete("/vendors/:vendorId",              deleteVendor);

module.exports = router;