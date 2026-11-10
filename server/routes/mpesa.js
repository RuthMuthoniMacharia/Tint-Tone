const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { releaseOrder } = require('../utils/orders');

const router = express.Router();

// CALLBACK: Safaricom calls this with the result of the customer's PIN entry (public URL)
router.post('/callback', async (req, res) => {
    const cb = req.body && req.body.Body && req.body.Body.stkCallback;
    // Always answer Safaricom quickly with success so it does not retry
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    if (!cb) return;

    try {
        const [rows] = await db.query(
            `SELECT order_id, payment_status FROM payments WHERE checkout_request_id = ?`,
            [cb.CheckoutRequestID]);
        if (!rows.length || rows[0].payment_status !== 'Pending') return; // unknown or already handled

        if (cb.ResultCode === 0) {
            const items = (cb.CallbackMetadata && cb.CallbackMetadata.Item) || [];
            const receipt = (items.find((i) => i.Name === 'MpesaReceiptNumber') || {}).Value || null;
            await db.query(
                `UPDATE payments SET payment_status = 'Paid', mpesa_receipt = ?, transaction_ref = ?
                 WHERE order_id = ?`, [receipt, receipt, rows[0].order_id]);
        } else {
            // Cancelled, wrong PIN, insufficient funds, timeout...
            await releaseOrder(rows[0].order_id, 'Failed');
        }
    } catch (err) {
        console.error('M-Pesa callback error:', err.message);
    }
});

// STATUS: the front-end polls this after the prompt is sent (customer must own the order)
router.get('/status/:orderId', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.payment_status, p.mpesa_receipt, o.order_status
             FROM payments p JOIN orders o ON o.order_id = p.order_id
             WHERE p.order_id = ? AND o.user_id = ?`, [req.params.orderId, req.user.id]);
        if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not check payment status.' });
    }
});

module.exports = router;