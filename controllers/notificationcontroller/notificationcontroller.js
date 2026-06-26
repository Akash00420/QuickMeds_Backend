const Notification = require("../../models/notificationModel/notificationModel");
const asyncHandler = require("../../utils/asyncHandler");
const apiResponse = require("../../utils/apiResponse");

// =========================
// ✅ GET MY NOTIFICATIONS
// =========================
// GET /api/notifications?isRead=false&page=1&limit=20
const getMyNotifications = asyncHandler(async (req, res) => {
  const { isRead, page = 1, limit = 20 } = req.query;

  const filter = { recipient: req.user._id };
  if (isRead !== undefined) filter.isRead = isRead === "true";

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

  return apiResponse.success(
    res,
    { notifications, total, unreadCount, page: Number(page) },
    "Notifications fetched"
  );
});

// =========================
// ✅ GET UNREAD COUNT
// =========================
// GET /api/notifications/unread-count
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  return apiResponse.success(res, { unreadCount }, "Unread count fetched");
});

// =========================
// ✅ MARK ONE AS READ
// =========================
// PATCH /api/notifications/:notificationId/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.notificationId);
  if (!notification) return apiResponse.error(res, "Notification not found", 404);

  if (notification.recipient.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized", 403);
  }

  notification.isRead = true;
  await notification.save();

  return apiResponse.success(res, { notification }, "Notification marked as read");
});

// =========================
// ✅ MARK ALL AS READ
// =========================
// PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return apiResponse.success(res, null, "All notifications marked as read");
});

// =========================
// ✅ DELETE NOTIFICATION
// =========================
// DELETE /api/notifications/:notificationId
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.notificationId);
  if (!notification) return apiResponse.error(res, "Notification not found", 404);

  if (notification.recipient.toString() !== req.user._id.toString()) {
    return apiResponse.error(res, "Not authorized", 403);
  }

  await notification.deleteOne();

  return apiResponse.success(res, null, "Notification deleted");
});

// =========================
// ✅ CLEAR ALL NOTIFICATIONS
// =========================
// DELETE /api/notifications/clear-all
const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });

  return apiResponse.success(res, null, "All notifications cleared");
});

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};