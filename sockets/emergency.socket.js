// =========================
// ✅ EMERGENCY SOCKET
// =========================
// Real-time delivery for emergency medicine requests. Pharmacists join
// a room keyed to their own pharmacy ID; the moment a user submits an
// emergency request, every nearby pharmacist's dashboard gets it pushed
// instantly — this can't wait for a manual page refresh.
//
// Usage in server.js:
//   require("./sockets/emergency.socket")(io);
//
// Usage in a controller (e.g. emergencycontroller.createEmergencyRequest):
//   const io = req.app.get("io");
//   nearbyPharmacies.forEach((pharmacy) => {
//     io.to(`pharmacy:${pharmacy._id}`).emit("emergency:new_request", { ... });
//   });

module.exports = (io) => {
  io.on("connection", (socket) => {
    // ----- Pharmacist joins their own pharmacy's room -----
    // Called once when the pharmacist dashboard loads, so they receive
    // every emergency broadcast aimed at their pharmacy.
    socket.on("emergency:join_pharmacy", (pharmacyId) => {
      if (!pharmacyId) return;
      socket.join(`pharmacy:${pharmacyId}`);
    });

    socket.on("emergency:leave_pharmacy", (pharmacyId) => {
      if (!pharmacyId) return;
      socket.leave(`pharmacy:${pharmacyId}`);
    });

    // ----- User joins a room to track their own emergency request -----
    // Called when a user submits a request, so they get notified the
    // moment any pharmacy accepts/rejects/fulfills it.
    socket.on("emergency:join_request", (emergencyRequestId) => {
      if (!emergencyRequestId) return;
      socket.join(`emergency:${emergencyRequestId}`);
    });

    socket.on("emergency:leave_request", (emergencyRequestId) => {
      if (!emergencyRequestId) return;
      socket.leave(`emergency:${emergencyRequestId}`);
    });
  });
};

// =========================
// ✅ EMIT HELPERS (called from controllers)
// =========================

// Broadcast a new emergency request to every nearby pharmacy
module.exports.emitNewRequest = (io, pharmacies, request) => {
  const payload = {
    emergencyRequestId: request._id,
    medicineName: request.medicineName,
    quantity: request.quantity,
    urgencyLevel: request.urgencyLevel,
    location: request.location,
  };

  pharmacies.forEach((pharmacy) => {
    io.to(`pharmacy:${pharmacy._id}`).emit("emergency:new_request", payload);
  });
};

// Notify the requesting user that a pharmacy accepted their request
module.exports.emitPharmacyAccepted = (io, request, pharmacy) => {
  io.to(`emergency:${request._id}`).emit("emergency:pharmacy_accepted", {
    emergencyRequestId: request._id,
    pharmacy: { id: pharmacy._id, name: pharmacy.name, phone: pharmacy.phone },
  });
};

// Notify the requesting user that their request has been fulfilled
module.exports.emitFulfilled = (io, request, pharmacy) => {
  io.to(`emergency:${request._id}`).emit("emergency:fulfilled", {
    emergencyRequestId: request._id,
    pharmacy: { id: pharmacy._id, name: pharmacy.name },
  });
};