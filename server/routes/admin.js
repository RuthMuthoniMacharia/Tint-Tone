const express = require('express');
const db = require('../db');
const { logAction } = require('../utils/audit');

const router = express.Router();
const STATUSES = ['Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

// Validates product fields; returns an error message or null
function checkProduct({ name, price, stock_quantity, category_id }) {
    if (!name || !name.trim()) return 'Product name is required.';
    if (!category_id) return 'Choose a category.';
    if (isNaN(price) || Number(price) < 0) return 'Price must be a number of 0 or more.';
    if (!Number.isInteger(Number(stock_quantity)) || Number(stock_quantity) < 0)
        return 'Stock must be a whole number of 0 or more.';
    return null;
}

// DASHBOARD STATS
router.get('/stats', async (req, res) => {
    try {
        const [[sales]] = await db.query(
            `SELECT COALESCE(SUM(total_amount), 0) AS total_sales, COUNT(*) AS total_orders
             FROM orders WHERE order_status <> 'Cancelled'`);
        const [[pending]] = await db.query(
            `SELECT COUNT(*) AS pending_orders FROM orders
             WHERE order_status IN ('Processing','Packed','Shipped')`);
        const [[low]] = await db.query(
            `SELECT COUNT(*) AS low_stock FROM products WHERE is_active = TRUE AND stock_quantity <= 5`);
        res.json({ ...sales, ...pending, ...low });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load dashboard figures.' });
    }
});

// PRODUCTS: list (search + category filter)
router.get('/products', async (req, res) => {
    const { search, category_id } = req.query;
    const where = [];
    const params = [];
    if (search) { where.push('p.name LIKE ?'); params.push(`%${search}%`); }
    if (category_id) { where.push('p.category_id = ?'); params.push(category_id); }

    try {
        const [rows] = await db.query(
            `SELECT p.*, c.name AS category_name
             FROM products p LEFT JOIN categories c ON p.category_id = c.category_id
             ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
             ORDER BY p.product_id DESC`, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load products.' });
    }
});

// PRODUCTS: add
router.post('/products', async (req, res) => {
    const problem = checkProduct(req.body);
    if (problem) return res.status(400).json({ error: problem });

    const { category_id, name, description, price, stock_quantity, image_url } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO products (category_id, name, description, price, stock_quantity, image_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [category_id, name.trim(), description || null, price, stock_quantity, image_url || 'default.png']
        );
        await logAction(req.user.id, 'ADD_PRODUCT', 'product', result.insertId,
            `Added "${name.trim()}" with stock ${stock_quantity}`);
        res.status(201).json({ message: 'Product added successfully', productId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not add product.' });
    }
});

// PRODUCTS: edit
router.put('/products/:id', async (req, res) => {
    const problem = checkProduct(req.body);
    if (problem) return res.status(400).json({ error: problem });

    const { category_id, name, description, price, stock_quantity, image_url, is_active } = req.body;
    try {
        const [old] = await db.query('SELECT name, price, stock_quantity FROM products WHERE product_id = ?',
            [req.params.id]);
        if (!old.length) return res.status(404).json({ error: 'Product not found.' });

        await db.query(
            `UPDATE products SET category_id = ?, name = ?, description = ?, price = ?,
             stock_quantity = ?, image_url = COALESCE(?, image_url), is_active = COALESCE(?, is_active)
             WHERE product_id = ?`,
            [category_id, name.trim(), description || null, price, stock_quantity,
             image_url || null, is_active ?? null, req.params.id]
        );
        await logAction(req.user.id, 'UPDATE_PRODUCT', 'product', Number(req.params.id),
            `"${old[0].name}": price ${old[0].price} -> ${price}, stock ${old[0].stock_quantity} -> ${stock_quantity}`);
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not update product.' });
    }
});

// PRODUCTS: delete (soft delete, keeps order history intact)
router.delete('/products/:id', async (req, res) => {
    try {
        const [result] = await db.query('UPDATE products SET is_active = FALSE WHERE product_id = ?',
            [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Product not found.' });
        await logAction(req.user.id, 'DELETE_PRODUCT', 'product', Number(req.params.id), 'Product deactivated');
        res.json({ message: 'Product removed from the shop.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not delete product.' });
    }
});

// CATEGORIES
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Could not load categories.' });
    }
});

// ORDERS: list (optional ?status=)
router.get('/orders', async (req, res) => {
    const { status } = req.query;
    try {
        const [rows] = await db.query(
            `SELECT o.*, u.full_name, u.email
             FROM orders o JOIN users u ON o.user_id = u.user_id
             ${status ? 'WHERE o.order_status = ?' : ''}
             ORDER BY o.order_date DESC`, status ? [status] : []);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load orders.' });
    }
});

// ORDERS: one order with its items
router.get('/orders/:id', async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT o.*, u.full_name, u.email FROM orders o
             JOIN users u ON o.user_id = u.user_id WHERE o.order_id = ?`, [req.params.id]);
        if (!orders.length) return res.status(404).json({ error: 'Order not found.' });
        const [items] = await db.query(
            `SELECT d.*, p.name FROM order_details d
             JOIN products p ON d.product_id = p.product_id WHERE d.order_id = ?`, [req.params.id]);
        res.json({ ...orders[0], items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load order.' });
    }
});

// ORDERS: update status
router.put('/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!STATUSES.includes(status))
        return res.status(400).json({ error: 'Invalid order status.' });
    try {
        const [old] = await db.query('SELECT order_status FROM orders WHERE order_id = ?', [req.params.id]);
        if (!old.length) return res.status(404).json({ error: 'Order not found.' });

        await db.query('UPDATE orders SET order_status = ? WHERE order_id = ?', [status, req.params.id]);
        await logAction(req.user.id, 'UPDATE_ORDER_STATUS', 'order', Number(req.params.id),
            `${old[0].order_status} -> ${status}`);
        res.json({ message: `Order marked as ${status}.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not update order.' });
    }
});

// AUDIT LOG: view (optional ?from=YYYY-MM-DD&to=YYYY-MM-DD)
router.get('/audit-logs', async (req, res) => {
    const { from, to } = req.query;
    const where = [];
    const params = [];
    if (from) { where.push('a.created_at >= ?'); params.push(from); }
    if (to) { where.push('a.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(to); }
    try {
        const [rows] = await db.query(
            `SELECT a.*, u.full_name AS admin_name
             FROM audit_logs a JOIN users u ON a.admin_id = u.user_id
             ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
             ORDER BY a.created_at DESC LIMIT 200`, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load audit log.' });
    }
});

module.exports = router;