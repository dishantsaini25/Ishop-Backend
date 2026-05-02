const AdminModel = require("../models/admin.model");
const logActivity = require("../utils/logActivity");
const { successResponse, serverError_Response, notFound_Response, createdResponse, updatedResponse, deleteResponse } = require("../utils/response");

// ✅ Get all admins (Only Super Admin)
const getAllAdmins = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role } = req.query;
        const skip = (page - 1) * limit;
        
        let query = {};
        
        // Search by name or email
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Filter by role
        if (role) {
            query.role = role;
        }
        
        const admins = await AdminModel.find(query)
            .select('-password')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await AdminModel.countDocuments(query);
        
        // Don't send password in response
        const safeAdmins = admins.map(admin => ({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions,
            is_active: admin.is_active,
            last_login: admin.last_login,
            created_at: admin.created_at
        }));
        
        return res.status(200).json({
            success: true,
            message: "Admins fetched successfully",
            data: {
                admins: safeAdmins,
                total,
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                pageSize: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error("Get all admins error:", error);
        return serverError_Response(res);
    }
};

// ✅ Get single admin by ID
const getAdminById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const admin = await AdminModel.findById(id).select('-password');
        
        if (!admin) {
            return notFound_Response(res, "Admin not found");
        }
        
        return res.status(200).json({
            success: true,
            message: "Admin fetched successfully",
            data: admin
        });
        
    } catch (error) {
        console.error("Get admin by id error:", error);
        return serverError_Response(res);
    }
};

// ✅ Create new admin (Only Super Admin)
const createAdmin = async (req, res) => {
    try {
        const { name, email, password, role, permissions, is_active } = req.body;
        
        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }
        
        // Email format validation
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }
        
        // Password length validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }
        
        // Check if admin already exists
        const existingAdmin = await AdminModel.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "Admin with this email already exists"
            });
        }
        
        // Default permissions based on role
        let defaultPermissions = {
            products: false,
            categories: false,
            brands: false,
            colors: false,
            orders: false,
            users: false,
            reports: false,
            settings: false
        };
        
        // Set permissions based on role
        if (role === 'admin') {
            defaultPermissions = {
                products: true,
                categories: true,
                brands: true,
                colors: true,
                orders: true,
                users: true,
                reports: false,
                settings: false
            };
        } else if (role === 'manager') {
            defaultPermissions = {
                products: true,
                categories: false,
                brands: false,
                colors: false,
                orders: true,
                users: false,
                reports: false,
                settings: false
            };
        } else if (role === 'support') {
            defaultPermissions = {
                products: false,
                categories: false,
                brands: false,
                colors: false,
                orders: true,
                users: true,
                reports: false,
                settings: false
            };
        }
        
        // Create new admin
        const newAdmin = new AdminModel({
            name,
            email,
            password,
            role: role || 'admin',
            permissions: permissions || defaultPermissions,
            is_active: is_active !== undefined ? is_active : true
        });
        
        await newAdmin.save();
        
        // Log activity
        await logActivity(req, 'CREATE_ADMIN', {
            created_admin_email: email,
            created_admin_role: role || 'admin'
        });
        
        // Remove password from response
        const adminResponse = {
            _id: newAdmin._id,
            name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role,
            permissions: newAdmin.permissions,
            is_active: newAdmin.is_active,
            created_at: newAdmin.created_at
        };
        
        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: adminResponse
        });
        
    } catch (error) {
        console.error("Create admin error:", error);
        return serverError_Response(res);
    }
};

// ✅ Update admin (Only Super Admin)
const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, permissions, is_active, password } = req.body;
        
        // Find admin
        const admin = await AdminModel.findById(id);
        if (!admin) {
            return notFound_Response(res, "Admin not found");
        }
        
        // Prevent updating super_admin role if only one exists
        if (admin.role === 'super_admin' && role && role !== 'super_admin') {
            const superAdmins = await AdminModel.countDocuments({ role: 'super_admin' });
            if (superAdmins <= 1) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot change role of the last super admin"
                });
            }
        }
        
        // Update fields
        if (name) admin.name = name;
        if (role) admin.role = role;
        if (permissions) admin.permissions = permissions;
        if (is_active !== undefined) admin.is_active = is_active;
        
        // Update password if provided
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters"
                });
            }
            admin.password = password; // Will be hashed by pre('save') middleware
        }
        
        await admin.save();
        
        // Log activity
        await logActivity(req, 'UPDATE_ADMIN', {
            updated_admin_email: admin.email,
            updates: { name, role, permissions, is_active, password: !!password }
        });
        
        // Remove password from response
        const adminResponse = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions,
            is_active: admin.is_active,
            last_login: admin.last_login,
            created_at: admin.created_at
        };
        
        return res.status(200).json({
            success: true,
            message: "Admin updated successfully",
            data: adminResponse
        });
        
    } catch (error) {
        console.error("Update admin error:", error);
        return serverError_Response(res);
    }
};

// ✅ Delete admin (Only Super Admin)
const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find admin
        const admin = await AdminModel.findById(id);
        if (!admin) {
            return notFound_Response(res, "Admin not found");
        }
        
        // Prevent deleting super_admin if only one exists
        if (admin.role === 'super_admin') {
            const superAdmins = await AdminModel.countDocuments({ role: 'super_admin' });
            if (superAdmins <= 1) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot delete the last super admin"
                });
            }
        }
        
        // Prevent admin from deleting their own account
        if (admin._id.toString() === req.admin._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });
        }
        
        const deletedAdminEmail = admin.email;
        const deletedAdminName = admin.name;
        
        await AdminModel.findByIdAndDelete(id);
        
        // Log activity
        await logActivity(req, 'DELETE_ADMIN', {
            deleted_admin_email: deletedAdminEmail,
            deleted_admin_name: deletedAdminName
        });
        
        return res.status(200).json({
            success: true,
            message: `Admin ${deletedAdminName} (${deletedAdminEmail}) deleted successfully`
        });
        
    } catch (error) {
        console.error("Delete admin error:", error);
        return serverError_Response(res);
    }
};

// ✅ Toggle admin active status
const toggleAdminStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        const admin = await AdminModel.findById(id);
        if (!admin) {
            return notFound_Response(res, "Admin not found");
        }
        
        // Prevent deactivating own account
        if (admin._id.toString() === req.admin._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot deactivate your own account"
            });
        }
        
        admin.is_active = !admin.is_active;
        await admin.save();
        
        await logActivity(req, 'TOGGLE_ADMIN_STATUS', {
            admin_email: admin.email,
            new_status: admin.is_active ? 'active' : 'inactive'
        });
        
        return res.status(200).json({
            success: true,
            message: `Admin ${admin.is_active ? 'activated' : 'deactivated'} successfully`,
            data: { is_active: admin.is_active }
        });
        
    } catch (error) {
        console.error("Toggle admin status error:", error);
        return serverError_Response(res);
    }
};

// ✅ Get admin statistics (for dashboard)
const getAdminStats = async (req, res) => {
    try {
        const totalAdmins = await AdminModel.countDocuments();
        const activeAdmins = await AdminModel.countDocuments({ is_active: true });
        const inactiveAdmins = await AdminModel.countDocuments({ is_active: false });
        
        const superAdmins = await AdminModel.countDocuments({ role: 'super_admin' });
        const admins = await AdminModel.countDocuments({ role: 'admin' });
        const managers = await AdminModel.countDocuments({ role: 'manager' });
        const supports = await AdminModel.countDocuments({ role: 'support' });
        
        // Last 30 days new admins
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const newAdmins = await AdminModel.countDocuments({
            created_at: { $gte: thirtyDaysAgo }
        });
        
        return res.status(200).json({
            success: true,
            message: "Admin statistics fetched",
            data: {
                total: totalAdmins,
                active: activeAdmins,
                inactive: inactiveAdmins,
                new_last_30_days: newAdmins,
                by_role: {
                    super_admin: superAdmins,
                    admin: admins,
                    manager: managers,
                    support: supports
                }
            }
        });
        
    } catch (error) {
        console.error("Get admin stats error:", error);
        return serverError_Response(res);
    }
};

module.exports = {
    getAllAdmins,
    getAdminById,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    toggleAdminStatus,
    getAdminStats
};