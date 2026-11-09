const db = require('../db');

// Records who did what. Never crashes the main request if logging fails.
async function logAction(adminId, actionType, targetEntity, targetId, details) {
    try {
        await db.query(
            `INSERT INTO audit_logs (admin_id, action_type, target_entity, target_id, details)
             VALUES (?, ?, ?, ?, ?)`,
            [adminId, actionType, targetEntity, targetId, details]
        );
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
}

module.exports = { logAction };