const ProductModel = require("../models/product.model");
const OrderModel = require("../models/order.model");
const UserModel = require("../models/user.model");
const AdminModel = require("../models/admin.model");
const ActivityLog = require("../models/ActivityLog.model");
const CategoryModel = require("../models/category.model");
const BrandModel = require("../models/brand.model");
const { successResponse, serverError_Response } = require("../utils/response");

// ✅ Main Dashboard Stats
const getDashboardStats = async (req, res) => {
    try {
        // Get all counts in parallel for better performance
        const [
            totalProducts,
            activeProducts,
            totalOrders,
            pendingOrders,
            totalUsers,
            verifiedUsers,
            totalAdmins,
            totalCategories,
            totalBrands
        ] = await Promise.all([
            ProductModel.countDocuments(),
            ProductModel.countDocuments({ status: true }),
            OrderModel.countDocuments(),
            OrderModel.countDocuments({ order_status: 0 }),
            UserModel.countDocuments(),
            UserModel.countDocuments({ isverified: true }),
            AdminModel.countDocuments(),
            CategoryModel.countDocuments(),
            BrandModel.countDocuments()
        ]);
        
        // Total revenue from delivered orders
        const revenueResult = await OrderModel.aggregate([
            { $match: { order_status: 5 } }, // Delivered orders
            { $group: { _id: null, total: { $sum: "$order_total" } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;
        
        // Today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const [
            todayOrders,
            todayRevenue,
            todayUsers
        ] = await Promise.all([
            OrderModel.countDocuments({ created_at: { $gte: today, $lt: tomorrow } }),
            OrderModel.aggregate([
                { $match: { created_at: { $gte: today, $lt: tomorrow }, order_status: 5 } },
                { $group: { _id: null, total: { $sum: "$order_total" } } }
            ]),
            UserModel.countDocuments({ created_at: { $gte: today, $lt: tomorrow } })
        ]);
        
        const todayRevenueAmount = todayRevenue[0]?.total || 0;
        
        // Last 7 days orders count
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const last7DaysOrders = await OrderModel.countDocuments({
            created_at: { $gte: sevenDaysAgo }
        });
        
        // Order status distribution
        const orderStatusDistribution = await OrderModel.aggregate([
            { $group: { _id: "$order_status", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        const statusMap = {
            0: 'Pending',
            1: 'Confirmed',
            2: 'Processing',
            3: 'Shipped',
            4: 'Out for Delivery',
            5: 'Delivered',
            6: 'Cancelled',
            7: 'Refunded'
        };
        
        const statusDistribution = {};
        orderStatusDistribution.forEach(item => {
            statusDistribution[statusMap[item._id] || 'Unknown'] = item.count;
        });
        
        // Low stock products (stock = false)
        const lowStockProducts = await ProductModel.countDocuments({ stock: false });
        
        return res.status(200).json({
            success: true,
            message: "Dashboard stats fetched successfully",
            data: {
                products: {
                    total: totalProducts,
                    active: activeProducts,
                    low_stock: lowStockProducts
                },
                orders: {
                    total: totalOrders,
                    pending: pendingOrders,
                    last_7_days: last7DaysOrders,
                    today: todayOrders,
                    status_distribution: statusDistribution
                },
                users: {
                    total: totalUsers,
                    verified: verifiedUsers,
                    today: todayUsers
                },
                revenue: {
                    total: totalRevenue,
                    today: todayRevenueAmount
                },
                categories: totalCategories,
                brands: totalBrands,
                admins: totalAdmins
            }
        });
        
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return serverError_Response(res);
    }
};

// ✅ Recent Activities
const getRecentActivities = async (req, res) => {
    try {
        const { limit = 20, action, admin_id } = req.query;
        
        let query = {};
        if (action) query.action = action;
        if (admin_id) query.admin_id = admin_id;
        
        const activities = await ActivityLog.find(query)
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .populate('admin_id', 'name email');
        
        // Add action labels for better readability
        const actionLabels = {
            'LOGIN': 'Logged in',
            'LOGOUT': 'Logged out',
            'CREATE_ADMIN': 'Created new admin',
            'UPDATE_ADMIN': 'Updated admin',
            'DELETE_ADMIN': 'Deleted admin',
            'CREATE_PRODUCT': 'Created product',
            'UPDATE_PRODUCT': 'Updated product',
            'DELETE_PRODUCT': 'Deleted product',
            'UPDATE_ORDER_STATUS': 'Updated order status',
            'CHANGE_PASSWORD': 'Changed password'
        };
        
        const activitiesWithLabels = activities.map(activity => ({
            ...activity.toObject(),
            action_label: actionLabels[activity.action] || activity.action,
            time_ago: getTimeAgo(activity.created_at)
        }));
        
        return res.status(200).json({
            success: true,
            message: "Recent activities fetched",
            data: activitiesWithLabels
        });
        
    } catch (error) {
        console.error("Get recent activities error:", error);
        return serverError_Response(res);
    }
};

// Helper function to get time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
}

// ✅ Recent Orders for Dashboard
const getRecentOrders = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const orders = await OrderModel.find()
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .populate('user_id', 'name email')
            .populate('product_details.product_id', 'name thumbnail');
        
        const orderStatusMap = {
            0: 'Pending',
            1: 'Confirmed',
            2: 'Processing',
            3: 'Shipped',
            4: 'Out for Delivery',
            5: 'Delivered',
            6: 'Cancelled',
            7: 'Refunded'
        };
        
        const paymentModeMap = {
            0: 'COD',
            1: 'Prepaid'
        };
        
        const ordersWithDetails = orders.map(order => ({
            _id: order._id,
            user: order.user_id ? {
                name: order.user_id.name,
                email: order.user_id.email
            } : null,
            order_total: order.order_total,
            order_status: order.order_status,
            order_status_text: orderStatusMap[order.order_status],
            payment_mode: order.payment_mode,
            payment_mode_text: paymentModeMap[order.payment_mode],
            shipping_details: order.shipping_details,
            product_count: order.product_details?.length || 0,
            created_at: order.created_at,
            time_ago: getTimeAgo(order.created_at)
        }));
        
        return res.status(200).json({
            success: true,
            message: "Recent orders fetched",
            data: ordersWithDetails
        });
        
    } catch (error) {
        console.error("Get recent orders error:", error);
        return serverError_Response(res);
    }
};

// ✅ Chart Data for Dashboard
const getChartData = async (req, res) => {
    try {
        const { days = 30, type = 'orders' } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        
        let chartData = [];
        
        if (type === 'orders') {
            // Daily orders count
            chartData = await OrderModel.aggregate([
                { $match: { created_at: { $gte: daysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                        count: { $sum: 1 },
                        revenue: { $sum: "$order_total" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        } else if (type === 'revenue') {
            // Daily revenue
            chartData = await OrderModel.aggregate([
                { $match: { created_at: { $gte: daysAgo }, order_status: 5 } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                        revenue: { $sum: "$order_total" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        } else if (type === 'users') {
            // Daily user registrations
            chartData = await UserModel.aggregate([
                { $match: { created_at: { $gte: daysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        }
        
        return res.status(200).json({
            success: true,
            message: "Chart data fetched",
            data: chartData
        });
        
    } catch (error) {
        console.error("Get chart data error:", error);
        return serverError_Response(res);
    }
};

// ✅ Top Products (Best Sellers)
const getTopProducts = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const topProducts = await OrderModel.aggregate([
            { $unwind: "$product_details" },
            {
                $group: {
                    _id: "$product_details.product_id",
                    total_sold: { $sum: "$product_details.qty" },
                    total_revenue: { $sum: "$product_details.total" }
                }
            },
            { $sort: { total_sold: -1 } },
            { $limit: parseInt(limit) }
        ]);
        
        // Populate product details
        const productIds = topProducts.map(p => p._id);
        const products = await ProductModel.find({ _id: { $in: productIds } })
            .select('name thumbnail final_price slug');
        
        const result = topProducts.map(top => {
            const product = products.find(p => p._id.toString() === top._id.toString());
            return {
                product: product || { _id: top._id },
                total_sold: top.total_sold,
                total_revenue: top.total_revenue
            };
        });
        
        return res.status(200).json({
            success: true,
            message: "Top products fetched",
            data: result
        });
        
    } catch (error) {
        console.error("Get top products error:", error);
        return serverError_Response(res);
    }
};

// ✅ Recent Products (Newly added)
const getRecentProducts = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const products = await ProductModel.find()
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .populate('category_id', 'name slug')
            .populate('brand_id', 'name slug')
            .select('name thumbnail final_price original_price stock status slug created_at');
        
        return res.status(200).json({
            success: true,
            message: "Recent products fetched",
            data: products
        });
        
    } catch (error) {
        console.error("Get recent products error:", error);
        return serverError_Response(res);
    }
};

// ✅ Order Trends (Weekly/Monthly)
const getOrderTrends = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query; // weekly, monthly, yearly
        
        let groupFormat;
        if (period === 'weekly') {
            groupFormat = { $isoWeek: "$created_at" };
        } else if (period === 'monthly') {
            groupFormat = { $dateToString: { format: "%Y-%m", date: "$created_at" } };
        } else {
            groupFormat = { $dateToString: { format: "%Y", date: "$created_at" } };
        }
        
        const trends = await OrderModel.aggregate([
            {
                $group: {
                    _id: groupFormat,
                    orders: { $sum: 1 },
                    revenue: { $sum: "$order_total" }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        return res.status(200).json({
            success: true,
            message: "Order trends fetched",
            data: trends,
            period: period
        });
        
    } catch (error) {
        console.error("Get order trends error:", error);
        return serverError_Response(res);
    }
};

module.exports = {
    getDashboardStats,
    getRecentActivities,
    getRecentOrders,
    getChartData,
    getTopProducts,
    getRecentProducts,
    getOrderTrends
};