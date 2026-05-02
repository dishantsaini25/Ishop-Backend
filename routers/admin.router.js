const router = require("express").Router();
const AdminModel = require("../models/admin.model");
const { adminAuth } = require("../middleware/adminAuth");
const { checkPermission } = require("../middleware/permissions");
const logActivity = require("../utils/logActivity");

// Auth Controllers
const {
    adminLogin,
    adminLogout,
    getCurrentAdmin,
    changePassword
} = require("../controllers/adminAuth.controller");

// Admin Management Controllers
const {
    getAllAdmins,
    getAdminById,
    createAdmin,
    updateAdmin,
    deleteAdmin
} = require("../controllers/adminManagement.controller");

// Product Controllers (Admin)
const {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateProductStatus
} = require("../controllers/adminProduct.controller");

// Order Controllers (Admin)
const {
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    updatePaymentStatus,
    getOrderStats
} = require("../controllers/adminOrder.controller");

// Dashboard Controllers
const {
    getDashboardStats,
    getRecentActivities,
    getRecentOrders
} = require("../controllers/dashboard.controller");

const {
    getAllUsers,
    getUserById,
    toggleUserStatus
} = require("../controllers/adminUser.controller");

const { getReports } = require("../controllers/adminReport.controller");

// ==================== PUBLIC ROUTES ====================

// Setup Super Admin
router.post("/setup", async (req, res) => {
    try {
        await AdminModel.deleteMany({ email: "admin@admin.com" });

        const admin = new AdminModel({
            name: "Super Admin",
            email: "admin@admin.com",
            password: "Admin@123",
            role: "super_admin",
            is_active: true
        });

        await admin.save();

        res.json({
            success: true,
            message: "Super Admin created successfully",
            credentials: {
                email: "admin@admin.com",
                password: "Admin@123"
            }
        });
    } catch (err) {
        console.error("Setup Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Login
router.post("/login", adminLogin);

// ==================== PROTECTED ROUTES ====================

// Auth
router.get("/me", adminAuth, getCurrentAdmin);
router.post("/logout", adminAuth, adminLogout);
router.put("/change-password", adminAuth, changePassword);

// ==================== ADMIN MANAGEMENT (Super Admin only) ====================
router.get("/admins", adminAuth, checkPermission('manage_admins'), getAllAdmins);
router.get("/admins/:id", adminAuth, checkPermission('manage_admins'), getAdminById);
router.post("/admins", adminAuth, checkPermission('manage_admins'), createAdmin);
router.put("/admins/:id", adminAuth, checkPermission('manage_admins'), updateAdmin);
router.delete("/admins/:id", adminAuth, checkPermission('manage_admins'), deleteAdmin);

// ==================== PRODUCT MANAGEMENT ====================
router.get("/products", adminAuth, checkPermission('products'), getAllProducts);
router.post("/products", adminAuth, checkPermission('products'), createProduct);
router.put("/products/:id", adminAuth, checkPermission('products'), updateProduct);
router.delete("/products/:id", adminAuth, checkPermission('products'), deleteProduct);
router.patch("/products/:id/status", adminAuth, checkPermission('products'), updateProductStatus);

// ==================== ORDER MANAGEMENT ====================
router.get("/orders", adminAuth, checkPermission('orders'), getAllOrders);
router.get("/orders/:id", adminAuth, checkPermission('orders'), getOrderById);
router.put("/orders/:id/status", adminAuth, checkPermission('orders'), updateOrderStatus);
router.put("/orders/:id/payment", adminAuth, checkPermission('orders'), updatePaymentStatus);
router.get("/orders/stats", adminAuth, checkPermission('orders'), getOrderStats);

// ==================== DASHBOARD ====================
router.get("/dashboard/stats", adminAuth, getDashboardStats);
router.get("/dashboard/activities", adminAuth, getRecentActivities);
router.get("/dashboard/recent-orders", adminAuth, getRecentOrders);

// ==================== ACTIVITY LOGS ====================
router.get("/logs", adminAuth, checkPermission('reports'), async (req, res) => {
    try {
        const ActivityLog = require("../models/ActivityLog.model");
        const { limit = 50, action } = req.query;
        
        let query = {};
        if (action) query.action = action;
        
        const logs = await ActivityLog.find(query)
            .sort({ created_at: -1 })
            .limit(parseInt(limit));
        
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


router.get("/users", adminAuth, checkPermission('users'), getAllUsers);
router.get("/users/:id", adminAuth, checkPermission('users'), getUserById);
router.put("/users/:id/status", adminAuth, checkPermission('users'), toggleUserStatus);

router.get("/reports", adminAuth, checkPermission('reports'), getReports);

module.exports = router;