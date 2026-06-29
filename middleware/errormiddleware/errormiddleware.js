// =========================
// ✅ ERROR MIDDLEWARE
// =========================
// Central error handler — catches anything passed to next(err) by
// asyncHandler, plus Mongoose/JWT/Multer errors, and returns a
// consistent JSON shape instead of leaking stack traces to the client.
//
// Usage (mounted LAST in server.js, after all routes):
//   const { errorHandler, notFound } = require("./middleware/errormiddleware/errormiddleware");
//   app.use(notFound);
//   app.use(errorHandler);

// ----- 404 handler (no route matched) -----
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

// ----- Main error handler -----
const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose: invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for field '${err.path}'`;
  }

  // Mongoose: validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Mongoose: duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field} already exists`;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Multer file upload errors
  if (err.name === "MulterError") {
    statusCode = 400;
    message = err.message;
  }

  console.error("❌ Error:", err);
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };