// Daraja (Safaricom) STK Push helper
const BASE = process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

let cached = { token: null, expires: 0 };

// Turns 07xxxxxx/ +2547xxxxxx
function normalizePhone(phone) {
    let p = String(phone).replace(/\D/g, ''); // strip everything except digits
    if (p.startsWith('0')) {
        p = '254' + p.slice(1);
    } else if (p.startsWith('7') || p.startsWith('1')) {
        p = '254' + p;
    }
    return p;
}

// YYYYMMDDHHmmss
function timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
           `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getToken() {
    if (cached.token && Date.now() < cached.expires) return cached.token;
    const auth = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` }
    });
    if (!res.ok) throw new Error(`Daraja token request failed (${res.status})`);
    const data = await res.json();
    cached = { token: data.access_token, expires: Date.now() + (Number(data.expires_in) - 60) * 1000 };
    return cached.token;
}

// Sends the PIN prompt to the customer's phone
async function stkPush({ phone, amount, orderId }) {
    const token = await getToken();
    const ts = timestamp();
    const password = Buffer.from(
        `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`).toString('base64');
    const msisdn = normalizePhone(phone);

    const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: ts,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.ceil(Number(amount)),
            PartyA: msisdn,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: msisdn,
            CallBackURL: process.env.MPESA_CALLBACK_URL,
            AccountReference: `TT${orderId}`,
            TransactionDesc: 'Tint and Tone order'
        })
    });
    const data = await res.json().catch(() => ({}));

    // LIVE RESPONSE LOGGING FOR TESTING
    console.log("DARAJA RESPONSE:", data);

    if (!res.ok || data.ResponseCode !== '0') {
        throw new Error(data.errorMessage || data.ResponseDescription || `STK push failed (${res.status})`);
    }
    return { checkoutRequestId: data.CheckoutRequestID, message: data.CustomerMessage };
}

module.exports = { stkPush, normalizePhone };