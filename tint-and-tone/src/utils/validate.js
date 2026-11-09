export function validateSignIn({ username, password }) {
  const errors = {};
  if (!username.trim()) errors.username = "Username is required";
  if (!password) errors.password = "Password is required";
  return errors;
}

export function validateSignUp({ username, email, password, confirm }, users) {
  const errors = {};
  const name = username.trim();
  if (name.length < 3) errors.username = "At least 3 characters";
  else if (users.some((u) => u.username.toLowerCase() === name.toLowerCase()))
    errors.username = "Username already taken";
  if (!/^\S+@\S+\.\S+$/.test(email))
    errors.email = "Enter a valid email address";
  if (password.length < 8 || !/\d/.test(password))
    errors.password = "At least 8 characters and one number";
  if (confirm !== password) errors.confirm = "Passwords do not match";
  return errors;
}

export function validateCheckout({ address, phone, card, exp, cvv }, method) {
  const errors = {};
  if (address.trim().length < 5) errors.address = "Enter a delivery address";
  if (method === "mpesa") {
    if (!/^(?:\+254|0)?[17]\d{8}$/.test(phone.replace(/\s/g, "")))
      errors.phone = "Enter a valid Safaricom number, e.g. 0712345678";
  } else {
    if (!/^\d{16}$/.test(card.replace(/\s/g, "")))
      errors.card = "Card number must be 16 digits";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) errors.exp = "Use MM/YY";
    if (!/^\d{3}$/.test(cvv)) errors.cvv = "3 digits";
  }
  return errors;
}
