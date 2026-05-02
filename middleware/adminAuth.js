const jwt = require("jsonwebtoken");
const AdminModel = require("../models/admin.model");

const adminAuth = async (req, res, next) => {
    try {
        let token = req.cookies?.admin_token;

        if (!token && req.headers.authorization) {
            token = req.headers.authorization.replace("Bearer ", "");
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "No token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await AdminModel.findById(decoded.id).select("-password");

        if (!admin) {
            return res.status(401).json({ success: false, message: "Admin not found" });
        }

        req.admin = admin;

        next(); 

    } catch (err) {
        console.error("Auth Error:", err.message);
        res.status(401).json({ success: false, message: "Invalid token" });
    }
};

module.exports = { adminAuth };
