const ActivityLog = require('../models/ActivityLog.model');

const logActivity = async (req, action, details = {}) => {
    try {
        await ActivityLog.create({
            admin_id: req.admin?._id || null,
            admin_email: req.admin?.email || null,
            action: action,
            details: details,
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.headers['user-agent'] || null
        });
    } catch (error) {
        console.error("Logging failed:", error);
     
    }
};

module.exports = logActivity;