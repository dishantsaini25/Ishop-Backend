const AdminModel = require("../models/admin.model");
const jwt = require("jsonwebtoken");
const logActivity = require("../utils/logActivity"); // ✅ Add this line

// 🔑 TOKEN GENERATE
const generateToken = (admin) => {
    return jwt.sign(
        { id: admin._id, email: admin.email, role: admin.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// ✅ LOGIN (with logging)
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('=== ADMIN LOGIN REQUEST ===');
        console.log('Email:', email);
        console.log('Origin:', req.headers.origin);
        console.log('NODE_ENV:', process.env.NODE_ENV);

        const admin = await AdminModel.findOne({ email });
        if (!admin) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const isValid = await admin.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Update last login
        admin.last_login = new Date();
        await admin.save();

        const token = generateToken(admin);

        const isProduction = process.env.NODE_ENV === 'production';

        const cookieOptions = {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction,
            path: '/'
        };

        console.log('Setting admin cookie with options:', cookieOptions);

        res.cookie("admin_token", token, cookieOptions);

        // ✅ Log activity
        await logActivity(req, 'LOGIN', { email: admin.email });

        console.log('✓ Admin login successful for:', email);

        res.json({
            success: true,
            message: "Login successful",
            data: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                token: token // Also send token in response for debugging
            }
        });

    } catch (err) {
        console.error("Admin Login Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ✅ LOGOUT (with logging)
const adminLogout = async (req, res) => {
    // ✅ Log activity before logout
    if (req.admin) {
        await logActivity(req, 'LOGOUT', { email: req.admin.email });
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.clearCookie("admin_token", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: '/'
    });
    
    console.log('✓ Admin logged out successfully');
    res.json({ success: true, message: "Logged out" });
};

// ✅ GET ADMIN
const getCurrentAdmin = async (req, res) => {
    const admin = await AdminModel.findById(req.admin._id).select("-password");
    res.json({ success: true, data: admin });
};

// ✅ CHANGE PASSWORD (with logging)
const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        const admin = await AdminModel.findById(req.admin._id);

        const isValid = await admin.comparePassword(current_password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: "Wrong current password" });
        }

        admin.password = new_password;
        await admin.save();

        // ✅ Log activity
        await logActivity(req, 'CHANGE_PASSWORD', { email: admin.email });

        res.json({ success: true, message: "Password changed successfully" });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    adminLogin,
    adminLogout,
    getCurrentAdmin,
    changePassword
};