/**
 * Calculates delivery fee based on order total and user subscription status
 * @param {number} cartTotal - Total amount of items in cart
 * @param {boolean} isSubscribed - Subscription status of the user
 * @returns {number} Delivery fee amount
 */
const calculateDeliveryFee = (cartTotal, isSubscribed) => {
  if (isSubscribed) return 0; // Free delivery for active subscribers
  if (cartTotal >= 500) return 0; // Free delivery for orders ₹500 and above
  return 50; // ₹50 delivery charge applied for orders under ₹500
};

module.exports = calculateDeliveryFee;