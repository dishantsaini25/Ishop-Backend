const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    admin_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin',
        default: null 
    },
    admin_email: { 
        type: String,
        default: null 
    },
    action: { 
        type: String, 
        required: true,
        enum: ['LOGIN', 'LOGOUT', 'CREATE_ADMIN', 'UPDATE_ADMIN', 'DELETE_ADMIN', 
               'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
               'CREATE_ORDER', 'UPDATE_ORDER', 'DELETE_ORDER',
               'CHANGE_PASSWORD', 'SETTINGS_CHANGE']
    },
    details: { 
        type: Object, 
        default: {} 
    },
    ip_address: { 
        type: String,
        default: null 
    },
    user_agent: { 
        type: String,
        default: null 
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    }
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;