const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

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

const app = express();

app.use(cors());
app.use(express.json());

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

// ADMIN PANEL API ROUTES (Member 3 - Ruth)

// 1. Get all products (Admin Inventory View)
app.get('/api/admin/products', async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT p.*, c.name AS category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.category_id
            ORDER BY p.product_id DESC
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Add new makeup / skincare product
app.post('/api/admin/products', async (req, res) => {
    const { category_id, name, description, price, stock_quantity, image_url } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO products (category_id, name, description, price, stock_quantity, image_url) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [category_id, name, description, price, stock_quantity, image_url || 'default.png']
        );
        res.status(201).json({ message: 'Product added successfully', productId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Update stock levels and details
app.put('/api/admin/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, stock_quantity } = req.body;
    try {
        await db.query(
            `UPDATE products SET name = ?, price = ?, stock_quantity = ? WHERE product_id = ?`,
            [name, price, stock_quantity, id]
        );
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Delete product listing
app.delete('/api/admin/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE product_id = ?', [id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Get customer order history (Admin Order Processing)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, u.full_name, u.email 
            FROM orders o 
            JOIN users u ON o.user_id = u.user_id 
            ORDER BY o.order_date DESC
        `);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});