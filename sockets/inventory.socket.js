// =========================
// ✅ INVENTORY SOCKET
// =========================
// Real-time stock updates. Two responsibilities:
//   1. Let connected clients "subscribe" to a specific medicine or
//      pharmacy so they only receive updates relevant to what they're
//      currently viewing (search results page, pharmacy dashboard).
//   2. Expose an `emitStockUpdate` helper that controllers can call
//      after writing to the DB, to push the change out instantly.
//
// Usage in server.js:
//   const { Server } = require("socket.io");
//   const io = new Server(httpServer, { cors: { origin: [...], credentials: true } });
//   require("./sockets/inventory.socket")(io);
//   app.set("io", io);   // <-- lets controllers do req.app.get("io").emit(...)
//
// Usage in a controller (e.g. medicinecontroller.updateStock):
//   const io = req.app.get("io");
//   io.to(`medicine:${medicine._id}`).emit("stock:updated", { ... });

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ----- Subscribe to a single medicine's stock updates -----
    // Frontend calls this when the user opens a medicine's detail view
    // or has it visible in search results.
    socket.on("inventory:subscribe_medicine", (medicineId) => {
      if (!medicineId) return;
      socket.join(`medicine:${medicineId}`);
    });

    socket.on("inventory:unsubscribe_medicine", (medicineId) => {
      if (!medicineId) return;
      socket.leave(`medicine:${medicineId}`);
    });

    // ----- Subscribe to all stock updates for a pharmacy -----
    // Used by the pharmacist's own dashboard to see live changes
    // (e.g. if they have it open on two devices).
    socket.on("inventory:subscribe_pharmacy", (pharmacyId) => {
      if (!pharmacyId) return;
      socket.join(`pharmacy:${pharmacyId}`);
    });

    socket.on("inventory:unsubscribe_pharmacy", (pharmacyId) => {
      if (!pharmacyId) return;
      socket.leave(`pharmacy:${pharmacyId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

// =========================
// ✅ EMIT HELPER (called from controllers)
// =========================
// Separated from the connection handler above so controllers can
// import just this function without needing the full `io.on("connection")` setup.
module.exports.emitStockUpdate = (io, medicine) => {
  const payload = {
    medicineId: medicine._id,
    pharmacyId: medicine.pharmacy,
    name: medicine.name,
    quantity: medicine.quantity,
    stockStatus: medicine.stockStatus,
    updatedAt: new Date(),
  };

  io.to(`medicine:${medicine._id}`).emit("stock:updated", payload);
  io.to(`pharmacy:${medicine.pharmacy}`).emit("stock:updated", payload);
};