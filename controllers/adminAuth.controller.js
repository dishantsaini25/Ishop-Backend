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

        res.cookie("admin_token", token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });

        // ✅ Log activity
        await logActivity(req, 'LOGIN', { email: admin.email });

        res.json({
            success: true,
            message: "Login successful",
            data: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ✅ LOGOUT (with logging)
const adminLogout = async (req, res) => {
    // ✅ Log activity before logout
    if (req.admin) {
        await logActivity(req, 'LOGOUT', { email: req.admin.email });
    }
    
    res.clearCookie("admin_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",
        path: '/'
    });
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