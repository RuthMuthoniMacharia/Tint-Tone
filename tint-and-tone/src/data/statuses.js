// The life of an order, in order. "Delivered" is the final state.
export const STATUSES = ["Processing", "Packed", "Shipped", "Delivered"];

// Statuses that count as "pending" in the admin sidebar
export const PENDING = ["Processing", "Packed", "Shipped"];

// The status that follows `status`, or undefined if it is already the last one
export const nextStatus = (status) => STATUSES[STATUSES.indexOf(status) + 1];
