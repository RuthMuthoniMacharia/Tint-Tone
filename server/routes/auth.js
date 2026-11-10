const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db'); 
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// REGISTER (customers only)
router.post('/register', async (req, res) => {
    const { full_name, email, password, phone_number, shipping_address } = req.body;

    if (!full_name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password are required.' });
    if (!EMAIL_RE.test(email))
        return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8)
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const hash = await bcrypt.hash(password, 10);
        
        // Register user into users table
        const insertUserSql = `INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'customer')`;
        
        db.query(insertUserSql, [full_name.trim(), normalizedEmail, hash], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'An account with this email already exists.' });
                }
                console.error('Registration DB Error:', err);
                return res.status(500).json({ error: 'Could not create account.' });
            }

            const newUserId = result.insertId;

            // Also insert customer details record
            const insertCustomerSql = `INSERT INTO customers (user_id, shipping_address, phone_number) VALUES (?, ?, ?)`;
            db.query(insertCustomerSql, [newUserId, shipping_address || null, phone_number || null], (cErr) => {
                if (cErr) console.error('Customer details insert warning:', cErr);
                return res.status(201).json({ message: 'Account created. You can now log in.' });
            });
        });
    } catch (err) {
        console.error('Bcrypt Error:', err);
        return res.status(500).json({ error: 'Could not create account. Try again.' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required.' });

    const normalizedEmail = email.trim().toLowerCase();

    const sql = 'SELECT * FROM users WHERE LOWER(email) = ?';
    db.query(sql, [normalizedEmail], async (err, results) => {
        if (err) {
            console.error('Login DB Error:', err);
            return res.status(500).json({ error: 'Login failed due to database error.' });
        }

        if (!results || results.length === 0) {
            return res.status(401).json({ error: 'Incorrect email or password.' });
        }

        const user = results[0];

        if (!user.is_active) {
            return res.status(403).json({ error: 'This account has been deactivated.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Incorrect email or password.' });
        }

        const token = jwt.sign(
            { id: user.user_id, role: user.role, name: user.full_name },
            process.env.JWT_SECRET || 'supersecretkey',
            { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
        );

        return res.json({
            token,
            user: { id: user.user_id, name: user.full_name, email: user.email, role: user.role }
        });
    });
});

// LOGOUT (token is stateless)
router.post('/logout', requireAuth, (req, res) => {
    res.json({ message: 'Logged out.' });
});

// CURRENT USER
router.get('/me', requireAuth, (req, res) => {
    res.json(req.user);
});

module.exports = router;