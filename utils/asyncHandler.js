// =========================
// ✅ ASYNC HANDLER
// =========================
// Wraps an async controller function so any thrown error or rejected
// promise is automatically passed to next(), instead of needing a
// try/catch block in every single controller.
//
// Usage:
//   const getProfile = asyncHandler(async (req, res) => { ... });

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;