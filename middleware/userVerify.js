const { serverError_Response } = require('../utils/response');
const jwt = require('jsonwebtoken');
const UserModel = require("../models/user.model");

async function userVerify(req, res, next) {
    try {
        let token = req.cookies?.user_token;
        
        if (!token && req.headers.authorization) {
            token = req.headers.authorization.startsWith('Bearer ') 
                ? req.headers.authorization.substring(7) 
                : req.headers.authorization;
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Please login"
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Invalid token"
            });
        }
        
        let user;
        if (decoded.id) {
            user = await UserModel.findById(decoded.id).select("-password -otp -otpExpiry -__v -createdAt -updatedAt");
        } else if (decoded.email) {
            user = await UserModel.findOne({ email: decoded.email }).select("-password -otp -otpExpiry -__v -createdAt -updatedAt");
        }
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - User not found"
            });
        }
        
        req.user = user;
        next();

    } catch (error) {
        console.log("UserVerify Error:", error);
        
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Invalid token"
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Session expired. Please login again."
            });
        }
        
        return serverError_Response(res);
    }
}

module.exports = userVerify;