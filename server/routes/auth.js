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

    const conn = await db.getConnection();
    try {
        const [existing] = await conn.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length)
            return res.status(409).json({ error: 'An account with this email already exists.' });

        const hash = await bcrypt.hash(password, 10);
        await conn.beginTransaction();
        const [result] = await conn.query(
            `INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'customer')`,
            [full_name.trim(), email.toLowerCase(), hash]
        );
        await conn.query(
            'INSERT INTO customers (user_id, shipping_address, phone_number) VALUES (?, ?, ?)',
            [result.insertId, shipping_address || null, phone_number || null]
        );
        await conn.commit();
        res.status(201).json({ message: 'Account created. You can now log in.' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Could not create account. Try again.' });
    } finally {
        conn.release();
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required.' });

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        const user = rows[0];
        const ok = user && (await bcrypt.compare(password, user.password_hash));

        // Same message for both cases so attackers cannot tell which was wrong
        if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });
        if (!user.is_active)
            return res.status(403).json({ error: 'This account has been deactivated.' });

        const token = jwt.sign(
            { id: user.user_id, role: user.role, name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
        );
        res.json({
            token,
            user: { id: user.user_id, name: user.full_name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed. Try again.' });
    }
});

// LOGOUT (token is stateless: the client deletes it)
router.post('/logout', requireAuth, (req, res) => {
    res.json({ message: 'Logged out.' });
});

// CURRENT USER
router.get('/me', requireAuth, (req, res) => {
    res.json(req.user);
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const generic = { message: 'If that email exists, a reset link has been sent.' };
    try {
        const [rows] = await db.query('SELECT user_id FROM users WHERE email = ?', [
            (email || '').toLowerCase()
        ]);
        if (rows.length) {
            const token = crypto.randomBytes(32).toString('hex');
            await db.query(
                `INSERT INTO password_resets (user_id, token_hash, expires_at)
                 VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
                [rows[0].user_id, sha256(token)]
            );
            // Email simulation: the link is printed in the server console
            console.log(`Password reset link: http://localhost:5173/reset-password?token=${token}`);
        }
        res.json(generic);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not process request.' });
    }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8)
        return res.status(400).json({ error: 'A valid token and a password of 8+ characters are required.' });

    try {
        const [rows] = await db.query(
            `SELECT reset_id, user_id FROM password_resets
             WHERE token_hash = ? AND used = FALSE AND expires_at > NOW()`,
            [sha256(token)]
        );
        if (!rows.length)
            return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

        const hash = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, rows[0].user_id]);
        await db.query('UPDATE password_resets SET used = TRUE WHERE reset_id = ?', [rows[0].reset_id]);
        res.json({ message: 'Password updated. You can now log in.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not reset password.' });
    }
});

module.exports = router;