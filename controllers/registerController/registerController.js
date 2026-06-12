const { v4: uuidv4 } = require("uuid");
const User = require("../../models/userModel/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { SECRET_KEY } = require("../../utils/config");

// ------------------------ CREATE USER ------------------------
exports.createregister = async (req, res, next) => {
  try {
    const { name, email, password, phone, confirm_password } = req.body;

    if (password !== confirm_password) {
      return res.status(400).json({
        msg: "Passwords do not match!",
        status_code: 400,
      });
    }

    const existing_email = await User.findOne({ email });
    if (existing_email) {
      return res.status(400).json({
        msg: "Email already registered!",
        status_code: 400,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      id: uuidv4(),
      name,
      email,
      phone,
      password: hashedPassword,
      role: "customer",
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    return res.status(201).json({
      msg: "User registered successfully!",
      status_code: 201,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------ CREATE DEFAULT ADMIN ------------------------
// called automatically on server start — NOT an HTTP route
exports.createDefaultAdmin = async () => {
  try {
    const adminEmail = "ghosakash94@gmail.com";

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      // user never registered — create fresh admin account
      const hashedPassword = await bcrypt.hash("Admin@123", 10);

      const newAdmin = new User({
        id: uuidv4(),
        name: "Akash Ghosh",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        phone: "0000000000",
        isActive: true,
      });

      await newAdmin.save();

      const token = jwt.sign(
        { id: newAdmin.id, email: newAdmin.email, role: newAdmin.role },
        SECRET_KEY,
        { expiresIn: "24h" }
      );

      console.log("---------------------------------------------------------");
      console.log("✅ Default admin created successfully!");
      console.log(`📧 Email    : ${adminEmail}`);
      console.log(`🔑 Password : Admin@123`);
      console.log(`🪙 Token    : ${token}`);
      console.log("---------------------------------------------------------");

    } else if (existingAdmin.role !== "admin") {
      // user already registered as customer — promote to admin
      existingAdmin.role = "admin";
      await existingAdmin.save();

      console.log("---------------------------------------------------------");
      console.log("✅ Existing user promoted to admin!");
      console.log(`📧 Email    : ${adminEmail}`);
      console.log("🔑 Password : unchanged — use your existing password");
      console.log("---------------------------------------------------------");

    } else {
      console.log("ℹ️  Admin already exists — no changes made.");
    }
  } catch (err) {
    console.error("❌ Error creating default admin:", err);
  }
};