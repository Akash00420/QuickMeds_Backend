const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");
const mapsService = require("../mapsservice/mapsservice");

// =========================
// ✅ EMERGENCY SERVICE
// =========================
// Handles the "broadcast to nearby pharmacies" logic for emergency
// medicine requests, including auto-expanding the search radius if
// nothing is found nearby — critical requests shouldn't come back empty
// just because the default radius was too small.

// ----- Find pharmacies to notify for an emergency request -----
// Tries the given radius first; if nothing found, expands up to 3 times.
const findPharmaciesToNotify = async (longitude, latitude, initialRadiusKm = 5) => {
  let radiusKm = initialRadiusKm;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const pharmacies = await Pharmacy.find({
      isVerified: true,
      isActive: true,
      acceptsEmergencyRequests: true,
      ...mapsService.buildNearbyQuery(longitude, latitude, radiusKm),
    });

    if (pharmacies.length > 0) {
      return { pharmacies, radiusUsedKm: radiusKm };
    }

    radiusKm *= 2; // double the search radius and try again
    attempts += 1;
  }

  return { pharmacies: [], radiusUsedKm: radiusKm };
};

// ----- Build the initial pharmacyResponses array for a new request -----
const buildPharmacyResponses = (pharmacies) => {
  return pharmacies.map((p) => ({
    pharmacy: p._id,
    status: "notified",
  }));
};

// ----- Determine urgency-based broadcast radius default -----
const getDefaultRadiusForUrgency = (urgencyLevel) => {
  const radiusMap = {
    critical: 10, // widen the net for critical cases
    high: 5,
    medium: 3,
  };
  return radiusMap[urgencyLevel] || 5;
};

module.exports = {
  findPharmaciesToNotify,
  buildPharmacyResponses,
  getDefaultRadiusForUrgency,
};