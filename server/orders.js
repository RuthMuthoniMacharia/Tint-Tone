const db = require('../db');

// Cancels an order, puts its stock back and marks the payment. Safe to call twice.
async function releaseOrder(orderId, paymentStatus = 'Failed') {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [orders] = await conn.query(
            'SELECT order_status FROM orders WHERE order_id = ? FOR UPDATE', [orderId]);
        if (!orders.length || orders[0].order_status === 'Cancelled') {
            await conn.rollback();
            return false;
        }
        const [items] = await conn.query(
            'SELECT product_id, quantity FROM order_details WHERE order_id = ?', [orderId]);
        for (const i of items) {
            await conn.query(
                'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
                [i.quantity, i.product_id]);
        }
        await conn.query(`UPDATE orders SET order_status = 'Cancelled' WHERE order_id = ?`, [orderId]);
        await conn.query('UPDATE payments SET payment_status = ? WHERE order_id = ?', [paymentStatus, orderId]);
        await conn.commit();
        return true;
    } catch (err) {
        await conn.rollback();
        console.error('releaseOrder failed:', err.message);
        return false;
    } finally {
        conn.release();
    }
}

module.exports = { releaseOrder };