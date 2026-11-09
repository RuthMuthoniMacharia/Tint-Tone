require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

(async () => {
    const [name, email, password] = process.argv.slice(2);
    if (!name || !email || !password) {
        console.log('Usage: node seedAdmin.js "Full Name" email password');
        process.exit(1);
    }
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
        `INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'super_admin')`,
        [name, email.toLowerCase(), hash]
    );
    await db.query('INSERT INTO administrators (user_id, employee_code) VALUES (?, ?)', [
        r.insertId, 'EMP' + String(r.insertId).padStart(3, '0')
    ]);
    console.log('Super admin created with id', r.insertId);
    process.exit(0);
})();