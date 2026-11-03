require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  console.log('Using:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    passwordSet: Boolean(process.env.DB_PASSWORD),
  });
  try {
    const c = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const [rows] = await c.query('SHOW TABLES');
    console.log('CONNECTED. Tables found:', rows.length);
    await c.end();
  } catch (e) {
    console.log('FAILED:', e.code, '-', e.message);
  }
})();