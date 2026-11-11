const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();
console.log('MPESA_ENABLED =', JSON.stringify(process.env.MPESA_ENABLED));
console.log('MPESA vars set:', {
    key: !!process.env.MPESA_CONSUMER_KEY,
    secret: !!process.env.MPESA_CONSUMER_SECRET,
    shortcode: !!process.env.MPESA_SHORTCODE,
    passkey: !!process.env.MPESA_PASSKEY,
    callback: !!process.env.MPESA_CALLBACK_URL
});

// AUTO-CREATE DATABASE IF IT DOES NOT EXIST
(async () => {
    try {
        const tempConn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306
        });
        await tempConn.query('CREATE DATABASE IF NOT EXISTS tint_tone;');
        console.log('✅ Database "tint_tone" verified / created successfully!');
        await tempConn.end();
    } catch (err) {
        console.error('⚠️ Database creation check failed:', err.message);
    }
})();

const db = require('./db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const reportRoutes = require('./routes/reports');
const mpesaRoutes = require('./routes/mpesa');
const { requireAuth, requireRole } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Public routes: register, login, forgot/reset password
app.use('/api/auth', authRoutes);

// M-Pesa: callback (public, called by Safaricom) and payment status
app.use('/api/mpesa', mpesaRoutes);

// Shop routes: browse products, place orders
app.use('/api', shopRoutes);

// Report routes (admin only). Must come before the general admin routes
app.use('/api/admin/reports', requireAuth, requireRole('admin', 'super_admin'), reportRoutes);

// Admin routes: need a valid token and an admin role
app.use('/api/admin', requireAuth, requireRole('admin', 'super_admin'), adminRoutes);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DATABASE() AS database_name');
        res.json({
            message: 'Database connected successfully!',
            database: rows[0].database_name
        });
    } catch (error) {
        console.error('MYSQL ERROR:', error);
        res.status(500).json({
            message: 'Database connection failed',
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
