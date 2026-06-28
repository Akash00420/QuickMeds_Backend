const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../utils/config");
const User = require("../../models/authModel/authModel");

// =========================
// ✅ PROTECT (authentication)
// =========================
// Verifies the JWT, then fetches the full user document from the
// database and attaches it to req.user. This means req.user._id,
// req.user.role, req.user.isActive etc. are always the CURRENT
// database state — not a stale snapshot frozen at login time.
exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "No token, authorization denied"
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY); // { id, email, role, iat, exp }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account has been deactivated"
      });
    }

    req.user = user; // full Mongoose document — has ._id, .role, .email, etc.

    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid token"
    });
  }
};

// =========================
// ✅ ADMIN ONLY (kept for backward compatibility)
// =========================
// Note: prefer using rolemiddleware's authorize("admin") for new routes —
// this stays here so any existing route still importing adminOnly
// doesn't break.
exports.adminOnly = (req, res, next) => {

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access only"
    });
  }

  next();
};