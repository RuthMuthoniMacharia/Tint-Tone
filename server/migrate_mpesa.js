// Run once: node migrate_mpesa.js
require('dotenv').config();
const db = require('./db');

(async () => {
    try {
        await db.query(`ALTER TABLE payments
            ADD COLUMN checkout_request_id VARCHAR(100) NULL,
            ADD COLUMN mpesa_receipt VARCHAR(30) NULL`);
        console.log('payments table updated.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') console.log('Already updated, nothing to do.');
        else console.error('Failed:', err.message);
    }
    process.exit(0);
})();