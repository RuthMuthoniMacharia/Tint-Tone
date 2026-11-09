const jwt = require('jsonwebtoken');

// Checks the token sent in the Authorization header
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Please log in to continue.' });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
}

// Allows only the listed roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to do this.' });
        }
        next();
    };
}

module.exports = { requireAuth, requireRole };