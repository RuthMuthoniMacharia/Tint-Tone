require('dotenv').config();
const db = require('./db');

(async () => {
    const [cmd, ...ids] = process.argv.slice(2);

    if (cmd === 'list') {
        const [rows] = await db.query(
            'SELECT product_id, name, stock_quantity, is_active FROM products');
        console.table(rows);
    } else if (cmd === 'delete' && ids.length) {
        for (const id of ids) {
            try {
                await db.query('DELETE FROM products WHERE product_id = ?', [id]);
                console.log(`Deleted product ${id}`);
            } catch (err) {
                // Products that have been ordered cannot be deleted, so hide them instead
                await db.query('UPDATE products SET is_active = FALSE WHERE product_id = ?', [id]);
                console.log(`Product ${id} has orders, so it was hidden instead`);
            }
        }
    } else {
        console.log('Usage: node cleanup.js list   OR   node cleanup.js delete 1 2 3');
    }
    process.exit(0);
})();