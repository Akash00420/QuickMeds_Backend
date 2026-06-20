const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../utils/config");

exports.protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "No token, authorization denied"
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);   // use imported key

    req.user = decoded;

    next();

  } catch (error) {
    res.status(401).json({
      message: "Invalid token"
    });
  }
};

exports.adminOnly = (req, res, next) => {

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access only"
    });
  }

  next();
};