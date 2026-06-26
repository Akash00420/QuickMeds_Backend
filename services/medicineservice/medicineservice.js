const Medicine = require("../../models/medicineModel/medicineModel");
const Pharmacy = require("../../models/pharmacyModel/pharmacyModel");
const mapsService = require("../mapsservice/mapsservice");

// =========================
// ✅ MEDICINE SERVICE
// =========================
// Houses the core "search medicine near me" logic so the controller
// stays thin. Pulled out separately because this query is the heart
// of QuickMeds and is likely to grow (fuzzy matching, ranking by
// stock + distance + rating, caching, etc.) independently of the
// HTTP layer around it.

// ----- Find nearby pharmacies stocking a given medicine name -----
// Returns a flat list of { medicine, pharmacy, distanceKm } results,
// sorted by distance, limited to pharmacies that are verified + active.
const findNearbyStock = async ({ name, longitude, latitude, radiusKm = 5 }) => {
  if (!mapsService.isValidCoordinates(longitude, latitude)) {
    throw new Error("Invalid coordinates provided");
  }

  // Step 1: find pharmacies within range
  const nearbyPharmacies = await Pharmacy.find({
    isVerified: true,
    isActive: true,
    ...mapsService.buildNearbyQuery(longitude, latitude, radiusKm),
  });

  if (nearbyPharmacies.length === 0) return [];

  const pharmacyIds = nearbyPharmacies.map((p) => p._id);
  const pharmacyMap = new Map(nearbyPharmacies.map((p) => [p._id.toString(), p]));

  // Step 2: find matching medicines at those pharmacies
  const medicines = await Medicine.find({
    pharmacy: { $in: pharmacyIds },
    isAvailable: true,
    $text: { $search: name },
  });

  // Step 3: merge medicine + pharmacy + distance into one flat result
  const results = medicines.map((medicine) => {
    const pharmacy = pharmacyMap.get(medicine.pharmacy.toString());
    const [pLng, pLat] = pharmacy.location.coordinates;

    return {
      medicine: {
        id: medicine._id,
        name: medicine.name,
        genericName: medicine.genericName,
        brand: medicine.brand,
        strength: medicine.strength,
        quantity: medicine.quantity,
        unit: medicine.unit,
        stockStatus: medicine.stockStatus,
        sellingPrice: medicine.sellingPrice,
        mrp: medicine.mrp,
        requiresPrescription: medicine.requiresPrescription,
        image: medicine.image,
      },
      pharmacy: {
        id: pharmacy._id,
        name: pharmacy.name,
        address: pharmacy.address,
        phone: pharmacy.phone,
        isCurrentlyOpen: pharmacy.isCurrentlyOpen,
        rating: pharmacy.rating,
      },
      distanceKm: require("../../utils/calculateDistance")(
        Number(latitude),
        Number(longitude),
        pLat,
        pLng
      ),
    };
  });

  // Step 4: sort — in stock first, then by distance
  results.sort((a, b) => {
    if (a.medicine.stockStatus !== b.medicine.stockStatus) {
      const order = { available: 0, low: 1, out_of_stock: 2 };
      return order[a.medicine.stockStatus] - order[b.medicine.stockStatus];
    }
    return a.distanceKm - b.distanceKm;
  });

  return results;
};

// ----- Check if a specific medicine has enough stock for a request -----
const hasSufficientStock = async (medicineId, requestedQuantity) => {
  const medicine = await Medicine.findById(medicineId);
  if (!medicine) return false;
  return medicine.quantity >= requestedQuantity;
};

// ----- Decrement stock (used when a reservation is placed) -----
const decrementStock = async (medicineId, quantity) => {
  const medicine = await Medicine.findById(medicineId);
  if (!medicine) throw new Error("Medicine not found");
  if (medicine.quantity < quantity) throw new Error(`Insufficient stock for ${medicine.name}`);

  medicine.quantity -= quantity;
  await medicine.save();
  return medicine;
};

// ----- Restore stock (used when a reservation is cancelled) -----
const restoreStock = async (medicineId, quantity) => {
  const medicine = await Medicine.findByIdAndUpdate(
    medicineId,
    { $inc: { quantity } },
    { new: true }
  );
  return medicine;
};

module.exports = {
  findNearbyStock,
  hasSufficientStock,
  decrementStock,
  restoreStock,
};