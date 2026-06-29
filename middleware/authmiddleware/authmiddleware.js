// =========================
// ✅ AUTH MIDDLEWARE
// =========================
// Verifies the JWT, then fetches the FULL user document from the DB
// (not just the decoded payload) so controllers get up-to-date data
// (req.user._id, req.user.role, req.user.isActive, etc.) and so
// deactivated/deleted accounts are caught even with a still-valid token.
//
// Usage:
//   const { protect, adminOnly } = require("../../middleware/authmiddleware/authmiddleware");
//   router.get("/me", protect, someHandler);

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../utils/config");
const User = require("../../models/authModel/authModel");

// ----- Protect: verifies token, attaches full user doc to req.user -----
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token, authorization denied",
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY); // { id, email, role }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    req.user = user; // full Mongoose document — has ._id, .role, .isActive, etc.

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// ----- AdminOnly: simple role gate (kept for backward compatibility) -----
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};

module.exports = { protect, adminOnly };