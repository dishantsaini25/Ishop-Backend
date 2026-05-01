const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const Notification = require('../models/Notification');

// Get all notifications
router.get('/admin/notifications', adminAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({ user_id: req.admin._id })
            .sort({ created_at: -1 })
            .limit(50);
        
        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Mark as read
router.put('/admin/notifications/:id/read', adminAuth, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, user_id: req.admin._id },
            { read: true }
        );
        
        res.json({
            success: true,
            message: 'Marked as read'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Mark all as read
router.put('/admin/notifications/read-all', adminAuth, async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.admin._id, read: false },
            { read: true }
        );
        
        res.json({
            success: true,
            message: 'All marked as read'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;