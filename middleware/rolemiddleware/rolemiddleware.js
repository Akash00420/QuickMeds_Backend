// =========================
// ✅ ROLE MIDDLEWARE
// =========================
// Restricts a route to specific user roles. Must run AFTER `protect`
// (auth middleware), since it relies on req.user already being set.
//
// Usage:
//   router.post("/", protect, authorize("pharmacist"), registerPharmacy);
//   router.get("/", protect, authorize("admin", "pharmacist"), someHandler);

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

module.exports = { authorize };