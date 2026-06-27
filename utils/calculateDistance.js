// =========================
// ✅ CALCULATE DISTANCE (Haversine formula)
// =========================
// Returns the distance in kilometers between two lat/lng points.
// Used to display "X km away" next to search results, on top of
// MongoDB's own $nearSphere sorting.
//
// Usage:
//   const km = calculateDistance(userLat, userLng, pharmacyLat, pharmacyLng);

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const EARTH_RADIUS_KM = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = EARTH_RADIUS_KM * c;

  return Math.round(distanceKm * 10) / 10; // rounded to 1 decimal place
};

module.exports = calculateDistance;