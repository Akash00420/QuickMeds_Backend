const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} = require("../../controllers/notificationcontroller/notificationcontroller"); // ✅ fixed

const { protect } = require("../../middleware/authmiddleware/authmiddleware"); // ✅ fixed

// All notification routes require a logged-in user
router.use(protect);

// =========================
// ✅ READ
// =========================
router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);

// =========================
// ✅ UPDATE
// =========================
router.patch("/read-all", markAllAsRead);
router.patch("/:notificationId/read", markAsRead);

// =========================
// ✅ DELETE
// =========================
router.delete("/clear-all", clearAllNotifications);
router.delete("/:notificationId", deleteNotification);

module.exports = router;