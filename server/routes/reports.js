const express = require('express');
const db = require('../db');

const router = express.Router();

// Company details printed at the top of every report
const COMPANY = { name: 'Tint & Tone', tagline: 'Makeup & Skincare', logo: '/logo.png' };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Only these columns can be sorted on (prevents SQL injection through ORDER BY)
const SALES_SORT = {
    date: 'o.order_date',
    total: 'o.total_amount',
    customer: 'u.full_name',
    status: 'o.order_status'
};

// Builds the date filter shared by the sales reports
function dateFilter(from, to, params) {
    const where = [];
    if (from) { where.push('o.order_date >= ?'); params.push(from); }
    if (to) { where.push('o.order_date < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(to); }
    return where;
}

function badDates(from, to) {
    if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to)))
        return 'Dates must be in the format YYYY-MM-DD.';
    if (from && to && from > to) return 'The start date must be before the end date.';
    return null;
}

// SALES REPORT: orders in a date range
// GET /api/admin/reports/sales?from=2026-11-01&to=2026-11-30&status=Delivered&sort=total&dir=desc
router.get('/sales', async (req, res) => {
    const { from, to, status, sort = 'date', dir = 'desc' } = req.query;
    const problem = badDates(from, to);
    if (problem) return res.status(400).json({ error: problem });

    const params = [];
    const where = dateFilter(from, to, params);
    if (status) { where.push('o.order_status = ?'); params.push(status); }
    else where.push(`o.order_status <> 'Cancelled'`);

    const sortCol = SALES_SORT[sort] || SALES_SORT.date;
    const direction = String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    try {
        const [rows] = await db.query(
            `SELECT o.order_id, o.order_date, u.full_name AS customer, o.order_status,
                    p.payment_method, p.transaction_ref, o.total_amount
             FROM orders o
             JOIN users u ON o.user_id = u.user_id
             LEFT JOIN payments p ON p.order_id = o.order_id
             WHERE ${where.join(' AND ')}
             ORDER BY ${sortCol} ${direction}`, params);

        const revenue = rows.reduce((sum, r) => sum + Number(r.total_amount), 0);
        res.json({
            company: COMPANY,
            title: 'Sales Report',
            generated_at: new Date().toISOString(),
            filters: { from: from || null, to: to || null, status: status || 'All except Cancelled', sort, dir: direction },
            rows,
            summary: {
                total_orders: rows.length,
                total_revenue: revenue,
                average_order: rows.length ? Math.round((revenue / rows.length) * 100) / 100 : 0
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not generate the sales report.' });
    }
});

// BEST SELLERS: units and revenue per product in a date range
// GET /api/admin/reports/products?from=...&to=...
router.get('/products', async (req, res) => {
    const { from, to } = req.query;
    const problem = badDates(from, to);
    if (problem) return res.status(400).json({ error: problem });

    const params = [];
    const where = dateFilter(from, to, params);
    where.push(`o.order_status <> 'Cancelled'`);

    try {
        const [rows] = await db.query(
            `SELECT pr.product_id, pr.name, c.name AS category,
                    SUM(d.quantity) AS units_sold,
                    SUM(d.quantity * d.unit_price_at_sale) AS revenue
             FROM order_details d
             JOIN orders o ON d.order_id = o.order_id
             JOIN products pr ON d.product_id = pr.product_id
             LEFT JOIN categories c ON pr.category_id = c.category_id
             WHERE ${where.join(' AND ')}
             GROUP BY pr.product_id, pr.name, c.name
             ORDER BY units_sold DESC`, params);
        res.json({
            company: COMPANY,
            title: 'Best Selling Products',
            generated_at: new Date().toISOString(),
            filters: { from: from || null, to: to || null },
            rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not generate the product report.' });
    }
});

// LOW STOCK: active products at or below a threshold (default 5)
// GET /api/admin/reports/low-stock?threshold=10
router.get('/low-stock', async (req, res) => {
    const threshold = Number(req.query.threshold ?? 5);
    if (!Number.isInteger(threshold) || threshold < 0)
        return res.status(400).json({ error: 'Threshold must be a whole number of 0 or more.' });
    try {
        const [rows] = await db.query(
            `SELECT p.product_id, p.name, c.name AS category, p.stock_quantity, p.price
             FROM products p LEFT JOIN categories c ON p.category_id = c.category_id
             WHERE p.is_active = TRUE AND p.stock_quantity <= ?
             ORDER BY p.stock_quantity ASC, p.name`, [threshold]);
        res.json({
            company: COMPANY,
            title: 'Low Stock Report',
            generated_at: new Date().toISOString(),
            filters: { threshold },
            rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not generate the low stock report.' });
    }
});

module.exports = router;