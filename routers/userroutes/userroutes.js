const express = require("express");
const router = express.Router();
const { getProfileStats } = require("../../controllers/reservationcontroller/reservationcontroller");
const { protect } = require("../../middleware/authmiddleware/authmiddleware");

// Jab frontend /api/users/profile-stats call karega, ye use handle karega
router.get("/profile-stats", protect, getProfileStats);

module.exports = router;