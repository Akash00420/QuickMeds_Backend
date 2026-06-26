const calculateDistance = require("../../utils/calculateDistance");

// =========================
// ✅ MAPS SERVICE
// =========================
// Geo helper functions shared across controllers (pharmacy, medicine,
// emergency) — anything involving coordinates, distance, or building
// MongoDB geospatial queries lives here instead of being duplicated
// in every controller.

// ----- Build a MongoDB $nearSphere geo query -----
// Usage: Pharmacy.find(buildNearbyQuery(longitude, latitude, radiusKm))
const buildNearbyQuery = (longitude, latitude, radiusKm = 5) => {
  return {
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)],
        },
        $maxDistance: Number(radiusKm) * 1000, // km → meters
      },
    },
  };
};

// ----- Attach a distanceKm field to a list of documents -----
// Each doc must have a GeoJSON `location.coordinates: [lng, lat]` field.
const attachDistances = (docs, userLat, userLng) => {
  return docs.map((doc) => {
    const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
    const [docLng, docLat] = obj.location?.coordinates || [0, 0];

    return {
      ...obj,
      distanceKm: calculateDistance(Number(userLat), Number(userLng), docLat, docLng),
    };
  });
};

// ----- Sort an array of docs (with distanceKm already attached) by distance -----
const sortByDistance = (docs) => {
  return [...docs].sort((a, b) => a.distanceKm - b.distanceKm);
};

// ----- Validate that longitude/latitude were provided and are sane -----
const isValidCoordinates = (longitude, latitude) => {
  const lng = Number(longitude);
  const lat = Number(latitude);

  if (Number.isNaN(lng) || Number.isNaN(lat)) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat < -90 || lat > 90) return false;

  return true;
};

// ----- Convert a GeoJSON Point into a plain { longitude, latitude } object -----
const toLatLng = (geoPoint) => {
  if (!geoPoint?.coordinates) return null;
  const [longitude, latitude] = geoPoint.coordinates;
  return { longitude, latitude };
};

// ----- Build a GeoJSON Point from separate longitude/latitude values -----
const toGeoPoint = (longitude, latitude) => {
  return {
    type: "Point",
    coordinates: [Number(longitude), Number(latitude)],
  };
};

module.exports = {
  buildNearbyQuery,
  attachDistances,
  sortByDistance,
  isValidCoordinates,
  toLatLng,
  toGeoPoint,
};