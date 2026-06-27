// =========================
// ✅ API RESPONSE HELPERS
// =========================
// Standardized response shape across the whole API so the frontend
// always gets the same { success, message, data } structure.
//
// Usage:
//   return apiResponse.success(res, { user }, "Profile fetched");
//   return apiResponse.error(res, "User not found", 404);

const success = (res, data = null, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const error = (res, message = "Something went wrong", statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { success, error };