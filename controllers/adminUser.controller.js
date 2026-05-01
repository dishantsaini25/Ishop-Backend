const UserModel = require("../models/user.model");
const OrderModel = require("../models/order.model");
const { successResponse, serverError_Response } = require("../utils/response");
const logActivity = require("../utils/logActivity");

// Get all users (customers)
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        const users = await UserModel.find(query)
            .select('-password -otp -otpExpiry -resetPasswordOtp -resetPasswordOtpExpiry')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        // Get order count for each user
        const usersWithOrderCount = await Promise.all(
            users.map(async (user) => {
                const orderCount = await OrderModel.countDocuments({ user_id: user._id });
                return {
                    ...user.toObject(),
                    total_orders: orderCount,
                    status: user.isverified !== false
                };
            })
        );
        
        const total = await UserModel.countDocuments(query);
        
        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: usersWithOrderCount,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
        
    } catch (error) {
        console.error("Get all users error:", error);
        return serverError_Response(res);
    }
};

// Get single user details
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await UserModel.findById(id)
            .select('-password -otp -otpExpiry -resetPasswordOtp -resetPasswordOtpExpiry');
        
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        const orders = await OrderModel.find({ user_id: id })
            .sort({ createdAt: -1 })
            .limit(10);
        
        const orderCount = await OrderModel.countDocuments({ user_id: id });
        
        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            data: {
                ...user.toObject(),
                total_orders: orderCount,
                orders
            }
        });
        
    } catch (error) {
        console.error("Get user by id error:", error);
        return serverError_Response(res);
    }
};

// Toggle user status (block/unblock)
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        user.isverified = status;
        await user.save();
        
        await logActivity(req, 'UPDATE_USER_STATUS', {
            user_email: user.email,
            new_status: status ? 'active' : 'blocked'
        });
        
        return res.status(200).json({
            success: true,
            message: `User ${status ? 'activated' : 'blocked'} successfully`
        });
        
    } catch (error) {
        console.error("Toggle user status error:", error);
        return serverError_Response(res);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    toggleUserStatus
};