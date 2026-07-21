const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 🔹 Ensure "uploads" directory exists automatically
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// =========================
// ✅ MULTER STORAGE
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Spaces in filename replace to underscores for safety
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

// =========================
// ✅ FILE FILTER
// =========================
const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Unsupported file type. Only JPG, PNG, WEBP, and PDF are allowed."),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// =========================
// ✅ SINGLE FILE UPLOAD (WITH ERROR WRAPPER)
// =========================
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
        });
      }
      next();
    });
  };
};

// =========================
// ✅ MULTIPLE FILE UPLOAD
// =========================
const uploadMultiple = (fieldName, maxCount = 5) =>
  upload.array(fieldName, maxCount);

module.exports = { uploadSingle, uploadMultiple };