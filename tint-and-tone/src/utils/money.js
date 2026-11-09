export const kes = (n) => "KES " + n.toLocaleString();

// Free shipping over KES 5,000, otherwise a flat KES 300
export const shippingFor = (subtotal) =>
  subtotal === 0 || subtotal >= 5000 ? 0 : 300;
