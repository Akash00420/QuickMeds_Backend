const express = require("express");
const router = express.Router();
const { protect, superadminOnly } = require("../../middleware/authmiddleware/authmiddleware");
const {
  loginSuperAdmin,
  getAllAdmins,
  createAdmin,
  toggleAdminStatus,
  deleteAdmin,
  getAllUsersForSuperAdmin,
  toggleUserStatusForSuperAdmin,
} = require("../../controllers/superadminController/superadminController");

router.post("/login", loginSuperAdmin);

router.get("/admins", protect, superadminOnly, getAllAdmins);
router.post("/admins", protect, superadminOnly, createAdmin);
router.patch("/admins/:adminId/status", protect, superadminOnly, toggleAdminStatus);
router.delete("/admins/:adminId", protect, superadminOnly, deleteAdmin);

router.get("/users", protect, superadminOnly, getAllUsersForSuperAdmin);
router.put("/users/:userId/toggle-status", protect, superadminOnly, toggleUserStatusForSuperAdmin);

module.exports = router;