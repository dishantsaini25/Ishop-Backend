const OrderModel = require("../models/order.model");
const { successResponse, serverError_Response, notFound_Response, updatedResponse } = require("../utils/response");
const logActivity = require("../utils/logActivity");

// Order status mapping (for backend)
const orderStatusMap = {
    0: 'pending',
    1: 'confirmed',
    2: 'processing',
    3: 'shipped',
    4: 'out_for_delivery',
    5: 'delivered',
    6: 'cancelled',
    7: 'refunded'
};

// Reverse mapping for frontend to backend
const statusToValue = {
    'pending': 0,
    'confirmed': 1,
    'processing': 2,
    'shipped': 3,
    'out_for_delivery': 4,
    'delivered': 5,
    'cancelled': 6,
    'refunded': 7
};

// Payment status mapping
const paymentStatusMap = {
    0: 'pending',  // COD
    1: 'paid'      // Prepaid
};

// Get all orders (Admin) - Matches frontend OrdersPage
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'all', payment_mode, search } = req.query;
        const skip = (page - 1) * limit;
        
        let query = {};
        
        // Handle status filter (frontend sends 'pending', 'delivered', etc.)
        if (status !== 'all') {
            const statusValue = statusToValue[status];
            if (statusValue !== undefined) {
                query.order_status = statusValue;
            }
        }
        
        if (payment_mode !== undefined) {
            query.payment_mode = parseInt(payment_mode);
        }
        
        if (search) {
            query.$or = [
                { 'shipping_details.name': { $regex: search, $options: 'i' } },
                { 'shipping_details.contact': { $regex: search, $options: 'i' } },
                { order_number: { $regex: search, $options: 'i' } }
            ];
        }
        
        const orders = await OrderModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('user_id', 'name email')
            .populate('product_details.product_id', 'name thumbnail final_price');
        
        const total = await OrderModel.countDocuments(query);
        
        // Format orders to match frontend expectations (OrdersPage)
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            order_number: order._id.toString().slice(-8).toUpperCase(),
            user_id: order.user_id ? {
                _id: order.user_id._id,
                name: order.user_id.name,
                email: order.user_id.email
            } : { name: 'Guest', email: 'guest@example.com' },
            total_amount: order.order_total,
            order_status: orderStatusMap[order.order_status] || 'pending',
            payment_status: paymentStatusMap[order.payment_mode] || 'pending',
            payment_mode: order.payment_mode,
            created_at: order.createdAt,
            createdAt: order.createdAt,
            shipping_details: order.shipping_details,
            product_details: order.product_details.map(item => ({
                product_id: item.product_id,
                qty: item.qty,
                price: item.price,
                total: item.total
            }))
        }));
        
        return res.status(200).json({
            success: true,
            message: "Orders fetched successfully",
            data: formattedOrders,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
        
    } catch (error) {
        console.error("Get all orders error:", error);
        return serverError_Response(res);
    }
};

// Get single order details (Admin) - Matches frontend order detail page
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const order = await OrderModel.findById(id)
            .populate('user_id', 'name email')
            .populate('product_details.product_id', 'name thumbnail original_price final_price description slug');
        
        if (!order) {
            return notFound_Response(res, "Order not found");
        }
        
        const formattedOrder = {
            _id: order._id,
            order_number: order._id.toString().slice(-8).toUpperCase(),
            user_id: order.user_id ? {
                _id: order.user_id._id,
                name: order.user_id.name,
                email: order.user_id.email
            } : { name: 'Guest', email: 'guest@example.com' },
            total_amount: order.order_total,
            order_status: orderStatusMap[order.order_status] || 'pending',
            payment_status: paymentStatusMap[order.payment_mode] || 'pending',
            payment_mode: order.payment_mode,
            razorpay_order_id: order.razorpay_order_id,
            razorpay_payment_id: order.razorpay_payment_id,
            created_at: order.createdAt,
            updated_at: order.updatedAt,
            shipping_details: order.shipping_details,
            product_details: order.product_details.map(item => ({
                product_id: item.product_id,
                qty: item.qty,
                price: item.price,
                total: item.total,
                product: item.product_id ? {
                    _id: item.product_id._id,
                    name: item.product_id.name,
                    thumbnail: item.product_id.thumbnail,
                    final_price: item.product_id.final_price,
                    slug: item.product_id.slug
                } : null
            }))
        };
        
        return successResponse(res, "Order details fetched", formattedOrder);
        
    } catch (error) {
        console.error("Get order by id error:", error);
        return serverError_Response(res);
    }
};

// Update order status (Admin) - Matches frontend status update
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;  // Frontend sends { status: "delivered" }
        
        // Convert status string to value
        let statusValue;
        if (typeof status === 'string') {
            statusValue = statusToValue[status];
        } else {
            statusValue = status;
        }
        
        if (statusValue === undefined || statusValue < 0 || statusValue > 7) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid order status" 
            });
        }
        
        const order = await OrderModel.findById(id);
        if (!order) {
            return notFound_Response(res, "Order not found");
        }
        
        const oldStatus = order.order_status;
        order.order_status = statusValue;
        await order.save();
        
        // Log activity
        await logActivity(req, 'UPDATE_ORDER_STATUS', { 
            order_id: id, 
            old_status: orderStatusMap[oldStatus],
            new_status: orderStatusMap[statusValue]
        });
        
        return res.status(200).json({
            success: true,
            message: `Order status updated to ${orderStatusMap[statusValue]}`
        });
        
    } catch (error) {
        console.error("Update order status error:", error);
        return serverError_Response(res);
    }
};

// Update payment status (Admin)
const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_status } = req.body;
        
        const order = await OrderModel.findById(id);
        if (!order) {
            return notFound_Response(res, "Order not found");
        }
        
        order.payment_status = payment_status;
        await order.save();
        
        await logActivity(req, 'UPDATE_PAYMENT_STATUS', { 
            order_id: id, 
            payment_status: payment_status === 'paid' ? 'Paid' : 'Pending'
        });
        
        return updatedResponse(res, "Payment status updated successfully");
        
    } catch (error) {
        console.error("Update payment status error:", error);
        return serverError_Response(res);
    }
};

// Get order statistics (Admin dashboard)
const getOrderStats = async (req, res) => {
    try {
        const totalOrders = await OrderModel.countDocuments();
        const pendingOrders = await OrderModel.countDocuments({ order_status: 0 });
        const confirmedOrders = await OrderModel.countDocuments({ order_status: 1 });
        const processingOrders = await OrderModel.countDocuments({ order_status: 2 });
        const shippedOrders = await OrderModel.countDocuments({ order_status: 3 });
        const deliveredOrders = await OrderModel.countDocuments({ order_status: 5 });
        const cancelledOrders = await OrderModel.countDocuments({ order_status: 6 });
        
        // Total revenue from delivered orders
        const revenueResult = await OrderModel.aggregate([
            { $match: { order_status: 5 } },
            { $group: { _id: null, total: { $sum: "$order_total" } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;
        
        // Orders by status (for frontend)
        const ordersByStatus = {
            pending: pendingOrders,
            confirmed: confirmedOrders,
            processing: processingOrders,
            shipped: shippedOrders,
            delivered: deliveredOrders,
            cancelled: cancelledOrders
        };
        
        return successResponse(res, "Order statistics", {
            totalOrders,
            pendingOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue,
            ordersByStatus
        });
        
    } catch (error) {
        console.error("Order stats error:", error);
        return serverError_Response(res);
    }
};

// Get recent orders for dashboard
const getRecentOrders = async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        
        const orders = await OrderModel.find()
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('user_id', 'name email');
        
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            order_number: order._id.toString().slice(-8).toUpperCase(),
            user_id: order.user_id ? { name: order.user_id.name } : { name: 'Guest' },
            total_amount: order.order_total,
            order_status: orderStatusMap[order.order_status] || 'pending',
            created_at: order.createdAt,
            order_status_text: orderStatusMap[order.order_status] || 'Pending'
        }));
        
        return res.status(200).json({
            success: true,
            data: formattedOrders
        });
        
    } catch (error) {
        console.error("Get recent orders error:", error);
        return serverError_Response(res);
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    updatePaymentStatus,
    getOrderStats,
    getRecentOrders
};