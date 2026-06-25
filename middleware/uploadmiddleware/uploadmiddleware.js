const multer = require("multer");
const path = require("path");

// =========================
// ✅ MULTER STORAGE
// =========================
// Files are stored temporarily on disk, then uploaded to Cloudinary
// inside the controller (which deletes the temp file's job is just
// to get the file off the wire — Cloudinary's SDK reads req.file.path).

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// =========================
// ✅ FILE FILTER
// =========================
// Accepts images and PDFs (covers prescriptions, license docs, photos)

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
    cb(new Error("Unsupported file type. Only JPG, PNG, WEBP, and PDF are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// =========================
// ✅ SINGLE FILE UPLOAD
// =========================
// Usage: uploadSingle("avatar") → expects field name "avatar" in the request

const uploadSingle = (fieldName) => upload.single(fieldName);

// =========================
// ✅ MULTIPLE FILE UPLOAD
// =========================
// Usage: uploadMultiple("images", 5) → expects field name "images", max 5 files

const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

module.exports = { uploadSingle, uploadMultiple };