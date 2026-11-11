const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { stkPush } = require('../utils/mpesa');
const { releaseOrder } = require('../utils/orders');

const router = express.Router();

// PUBLIC: list active products
router.get('/products', async (req, res) => {
    const { search, category_id } = req.query;
    const where = ['p.is_active = TRUE'];
    const params = [];
    if (search) { where.push('p.name LIKE ?'); params.push(`%${search}%`); }
    if (category_id) { where.push('p.category_id = ?'); params.push(category_id); }

    try {
        const [rows] = await db.query(
            `SELECT p.product_id, p.name, p.description, p.price, p.stock_quantity,
                    p.image_url, c.name AS category_name
             FROM products p LEFT JOIN categories c ON p.category_id = c.category_id
             WHERE ${where.join(' AND ')}
             ORDER BY p.name`, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load products.' });
    }
});

// PUBLIC: list categories
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT category_id, name FROM categories ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Could not load categories.' });
    }
});

// CUSTOMER: place an order
router.post('/orders', requireAuth, async (req, res) => {
    const { items, shipping_address, payment_method, phone } = req.body;

    // 1. Validate input
    if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: 'Your cart is empty.' });
    if (!shipping_address || !shipping_address.trim())
        return res.status(400).json({ error: 'Delivery address is required.' });
    if (!['mpesa', 'card'].includes(payment_method))
        return res.status(400).json({ error: 'Choose M-Pesa or card.' });
    if (payment_method === 'mpesa' && !/^(07|01|254)\d{8,9}$/.test((phone || '').replace(/\s+/g, '')))
        return res.status(400).json({ error: 'Enter a valid M-Pesa number, e.g. 0712345678.' });
    for (const i of items) {
        if (!Number.isInteger(i.product_id) || !Number.isInteger(i.quantity) || i.quantity < 1)
            return res.status(400).json({ error: 'Invalid item in cart.' });
    }

    // Format phone number to international format (2547...)
    let formattedPhone = phone ? String(phone).replace(/\D/g, '') : '';
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
        formattedPhone = '254' + formattedPhone;
    }

    // Merge duplicate product lines
    const wanted = new Map();
    for (const i of items) wanted.set(i.product_id, (wanted.get(i.product_id) || 0) + i.quantity);
    const ids = [...wanted.keys()].sort((a, b) => a - b);

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Lock product row, check stock, calculate database total
        let total = 0;
        const lines = [];
        for (const id of ids) {
            const qty = wanted.get(id);
            const [rows] = await conn.query(
                'SELECT product_id, name, price, stock_quantity, is_active FROM products WHERE product_id = ? FOR UPDATE',
                [id]);
            const p = rows[0];
            if (!p || !p.is_active) {
                await conn.rollback();
                return res.status(404).json({ error: 'A product in your cart is no longer available.' });
            }
            if (p.stock_quantity < qty) {
                await conn.rollback();
                return res.status(409).json({
                    error: `Only ${p.stock_quantity} left of "${p.name}". Please reduce the quantity.`
                });
            }
            total += Number(p.price) * qty;
            lines.push({ id, qty, price: p.price });
        }

        // Create order row
        const userId = req.user ? req.user.id : null;
        const [order] = await conn.query(
            `INSERT INTO orders (user_id, total_amount, order_status, shipping_address, delivery_fee)
             VALUES (?, ?, 'Processing', ?, 0)`,
            [userId, total, shipping_address.trim()]);

        for (const l of lines) {
            await conn.query(
                `INSERT INTO order_details (order_id, product_id, quantity, unit_price_at_sale)
                 VALUES (?, ?, ?, ?)`,
                [order.insertId, l.id, l.qty, l.price]);
            await conn.query(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
                [l.qty, l.id]);
        }

        const live = payment_method === 'mpesa' && process.env.MPESA_ENABLED === 'true';
        const ref = (payment_method === 'mpesa' ? 'MP' : 'CD') +
            crypto.randomBytes(4).toString('hex').toUpperCase();
        await conn.query(
            `INSERT INTO payments (order_id, payment_method, transaction_ref, amount, payment_status)
             VALUES (?, ?, ?, ?, ?)`,
            [order.insertId, payment_method, live ? null : ref, total, live ? 'Pending' : 'Paid']);

        await conn.commit();

        if (live) {
            try {
                const r = await stkPush({ phone: formattedPhone, amount: total, orderId: order.insertId });
                await db.query('UPDATE payments SET checkout_request_id = ? WHERE order_id = ?',
                    [r.checkoutRequestId, order.insertId]);
                return res.status(202).json({
                    message: 'Check your phone and enter your M-Pesa PIN to complete payment.',
                    order_id: order.insertId,
                    total: total,
                    payment_status: 'Pending'
                });
            } catch (err) {
                console.error('STK push failed:', err.message);
                await releaseOrder(order.insertId, 'Failed');
                return res.status(502).json({ error: 'Could not start the M-Pesa payment. Your order was not placed.' });
            }
        }

        res.status(201).json({
            message: 'Order placed successfully.',
            order_id: order.insertId,
            total: total,
            transaction_ref: ref
        });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Could not place your order. You have not been charged.' });
    } finally {
        conn.release();
    }
});

// CUSTOMER: order history
router.get('/orders/mine', requireAuth, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT order_id, order_date, total_amount, order_status, shipping_address
             FROM orders WHERE user_id = ? ORDER BY order_date DESC`, [req.user.id]);
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load your orders.' });
    }
});

module.exports = router;