const { serverError_Response, successResponse, notFound_Response, createdResponse } = require("../utils/response")
const OrderModel = require("../models/order.model")
const CartModel = require("../models/cart.model");
const Razorpay = require('razorpay');
const crypto = require("crypto");
const Notification = require("../models/Notification");
const Admin = require("../models/admin.model");

var instance = new Razorpay({ 
    key_id: process.env.RAZORPAY_KEY_ID, 
    key_secret: process.env.RAZORPAY_KEY_SECRET 
})

// Helper function to send notification to admin
const sendAdminNotification = async (req, title, message, type, orderId = null) => {
    try {
        const admin = await Admin.findOne();
        if (!admin) {
            console.log("No admin found in database");
            return;
        }

        const notification = new Notification({
            title: title,
            message: message,
            type: type,
            user_id: admin._id,
            created_at: new Date()
        });

        await notification.save();
        console.log(`✅ Notification saved: ${title}`);

        // Emit socket event for real-time notification
        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('new_notification', notification);
            console.log("🔔 Real-time notification sent to admin");
        }
    } catch (error) {
        console.log("Notification error:", error.message);
        // Don't fail order if notification fails
    }
};

const place = async (req, res) => {
    try {
        const { user_id, payment_mode, shipping_details, cart_items } = req.body;
        
        console.log("===== PLACE ORDER DEBUG =====");
        console.log("User ID:", user_id);
        console.log("Payment Mode:", payment_mode);
        console.log("Cart Items from frontend:", cart_items?.length);
        
        let productDetail = [];
        let order_total = 0;
 
        if (cart_items && cart_items.length > 0) {
            console.log("Using cart_items from frontend");
            productDetail = cart_items.map((item) => {
                return {
                    qty: item.qty,
                    product_id: item.id,
                    price: item.final_price,
                    total: item.qty * item.final_price
                }
            });
            
            order_total = productDetail.reduce(
                (sum, item) => sum + item.total,
                0
            );
        } else {
            console.log("Fetching cart from database");
            const cart = await CartModel.find({ userId: user_id }).populate("productId", "_id final_price");
            
            if (!cart || cart.length === 0) {
                return successResponse(res, "Cart is empty", null, false);
            }
            
            productDetail = cart.map((item) => {
                return {
                    qty: item.qty,
                    product_id: item.productId._id,
                    price: item.productId.final_price,
                    total: item.qty * item.productId.final_price
                }
            });
            
            order_total = productDetail.reduce(
                (sum, item) => sum + item.total,
                0
            );
        }
        
        console.log("Order Total (INR):", order_total);
        console.log("Product Details:", productDetail.length, "items");
      
        const order = await OrderModel.create({
            user_id,
            product_details: productDetail,
            order_total: order_total,
            payment_mode,
            shipping_details
        });
        
        console.log("Order Created:", order._id);

        // ✅ Send notification to admin for new order
        await sendAdminNotification(
            req,
            '🛒 New Order Placed!',
            `Order #${order._id} placed for ₹${order_total}`,
            'new_order',
            order._id
        );

        if (payment_mode === 0) {
            await CartModel.deleteMany({ userId: user_id });
            return createdResponse(res, "Order placed", order._id);
        } else {
            const amountInPaise = Math.round(order_total * 100);
            console.log("Amount in Paise:", amountInPaise);
            
            var options = {
                amount: amountInPaise,
                currency: "INR",
                receipt: order._id.toString()
            };
            
            instance.orders.create(options, async function (err, Razorder) {
                if (err) {
                    console.log("Razorpay Error:", err);
                    return serverError_Response(res, "Razorpay order creation failed");
                } else {
                    order.razorpay_order_id = Razorder.id;
                    await order.save();
                    
                    return successResponse(res, "Order placed successfully", {
                        order_id: order._id,
                        razorpay_order_id: Razorder.id,
                        amount: amountInPaise  
                    });
                }
            });
        }

    } catch (error) {
        console.log("Place Order Error:", error);
        return serverError_Response(res, error.message);
    }
}

const orderSuccess = async (req, res) => {
    try {
        const { order_id, user_id, razorpay_response } = req.body;
        
        console.log("===== ORDER SUCCESS DEBUG =====");
        console.log("Order ID:", order_id);
        console.log("User ID:", user_id);
        console.log("Razorpay Response:", razorpay_response);
        
        const order = await OrderModel.findById(order_id);
        
        if (!order) {
            console.log("Order not found:", order_id);
            return notFound_Response(res, "Order not found");
        }
        
        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_response.razorpay_order_id + "|" + razorpay_response.razorpay_payment_id)
            .digest("hex");
            
        if (generated_signature !== razorpay_response.razorpay_signature) {
            console.log("Signature mismatch");
            console.log("Generated:", generated_signature);
            console.log("Received:", razorpay_response.razorpay_signature);
            return serverError_Response(res, "Invalid payment signature");
        }

        order.payment_status = 1;
        order.order_status = 1;
        order.razorpay_payment_id = razorpay_response.razorpay_payment_id;
        await order.save();
        
        await CartModel.deleteMany({ userId: user_id });
        console.log("Cart cleared for user:", user_id);
        
        // ✅ Send payment success notification to admin
        await sendAdminNotification(
            req,
            '💰 Payment Received!',
            `Payment of ₹${order.order_total} received for Order #${order._id}`,
            'new_order',
            order._id
        );
        
        return res.status(200).json({
            success: true,
            message: "Payment successful, order placed",
            order_id: order._id
        });

    } catch (error) {
        console.error("Error in order success:", error);
        return serverError_Response(res, error.message);
    }
}

// Get user's orders
const getMyOrders = async (req, res) => {
    try {
        const user_id = req.user._id;
        
        const orders = await OrderModel.find({ user_id })
            .sort({ createdAt: -1 })
            .populate('product_details.product_id', 'name thumbnail');
        
        return res.status(200).json({
            success: true,
            message: "Orders fetched successfully",
            data: orders
        });
        
    } catch (error) {
        console.error("Get orders error:", error);
        return serverError_Response(res, error.message);
    }
};

// Get single order by ID
const getOrderById = async (req, res) => {
    try {
        const { order_id } = req.params;
        const user_id = req.user._id;
        
        const order = await OrderModel.findOne({ _id: order_id, user_id })
            .populate('product_details.product_id', 'name thumbnail final_price');
        
        if (!order) {
            return notFound_Response(res, "Order not found");
        }
        
        return res.status(200).json({
            success: true,
            message: "Order details fetched",
            data: order
        });
        
    } catch (error) {
        console.error("Get order detail error:", error);
        return serverError_Response(res, error.message);
    }
};

// ✅ New: Admin get all orders (for admin panel)
const getAllOrders = async (req, res) => {
    try {
        const orders = await OrderModel.find()
            .sort({ createdAt: -1 })
            .populate('product_details.product_id', 'name thumbnail');
        
        return res.status(200).json({
            success: true,
            message: "All orders fetched",
            data: orders
        });
    } catch (error) {
        console.error("Get all orders error:", error);
        return serverError_Response(res, error.message);
    }
};

// ✅ New: Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { order_status } = req.body;
        
        const order = await OrderModel.findByIdAndUpdate(
            order_id,
            { order_status: order_status },
            { new: true }
        );
        
        if (!order) {
            return notFound_Response(res, "Order not found");
        }
        
        // Send notification to admin about status update
        const statusText = order_status === 1 ? 'Confirmed' : order_status === 2 ? 'Shipped' : 'Delivered';
        await sendAdminNotification(
            req,
            `📦 Order ${statusText}`,
            `Order #${order._id} has been ${statusText.toLowerCase()}`,
            'general',
            order._id
        );
        
        return res.status(200).json({
            success: true,
            message: "Order status updated",
            data: order
        });
    } catch (error) {
        console.error("Update order status error:", error);
        return serverError_Response(res, error.message);
    }
};

module.exports = {
    place,
    orderSuccess,
    getOrderById,
    getMyOrders,
    getAllOrders,
    updateOrderStatus
}