const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
dotenv.config();
const app = express();

// 🔹 Shared CORS config (used by both Express and Socket.io)
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://1313kfc0-5173.inc1.devtunnels.ms"
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 HTTP server + Socket.io (Socket.io needs the raw http server, not just app)
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: corsOptions });
app.set("io", io); // lets controllers do: req.app.get("io").emit(...)

// 🔹 Attach socket handlers
require("./sockets/inventory.socket")(io);
require("./sockets/emergency.socket")(io);

// 🔹 Import createDefaultAdmin + createDefaultSuperAdmin
const { createDefaultAdmin } = require("./controllers/registerController/registerController");
const { createDefaultSuperAdmin } = require("./controllers/superadminController/superadminController");

// 🔹 MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully");
    await createDefaultAdmin();
    await createDefaultSuperAdmin();
  })
  .catch((err) => console.log("❌ MongoDB Connection Failed:", err));

// 🔹 Import Routes
const loginRoutes        = require("./routers/loginroutes/loginroutes");
const registerRoutes     = require("./routers/registerroutes/registerroutes");
const adminRoutes        = require("./routers/adminroutes/adminroutes");
const pharmacyRoutes     = require("./routers/pharmacyroutes/pharmacyroutes");
const medicineRoutes     = require("./routers/medicineroutes/medicineroutes");
const reservationRoutes  = require("./routers/reservationroutes/reservationroutes");
const emergencyRoutes    = require("./routers/emergencyroutes/emergencyroutes");
const notificationRoutes = require("./routers/notificationroutes/notificationroutes");
const subscriptionRoutes = require("./routers/subscriptionroutes/subscriptionroutes");
const paymentRoutes      = require("./routers/paymentroutes/paymentroutes");
const userRoutes         = require("./routers/userroutes/userroutes");
const superadminRoutes   = require("./routers/superadminroutes/superadminroutes");

// 🔹 Use Routes
app.use("/api/logins",        loginRoutes);
app.use("/api/registers",     registerRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/pharmacies",    pharmacyRoutes);
app.use("/api/medicines",     medicineRoutes);
app.use("/api/reservations",  reservationRoutes);
app.use("/api/emergency",     emergencyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/payments",      paymentRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/superadmin",    superadminRoutes);

// 🔹 Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "QuickMeds Backend is running successfully 🚀",
  });
});

// 🔹 Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// 🔹 Server Start
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready`);
});