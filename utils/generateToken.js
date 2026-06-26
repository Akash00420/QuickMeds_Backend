const jwt = require("jsonwebtoken");
const { SECRET_KEY, JWT_EXPIRES_IN } = require("./config");

// =========================
// ✅ GENERATE TOKEN
// =========================
// Signs a JWT containing the user's id, email, and role.
// Used by logincontroller, registerController, and createDefaultAdmin.
//
// Usage:
//   const token = generateToken({ id: user.id, email: user.email, role: user.role });

const generateToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
};

module.exports = generateToken;