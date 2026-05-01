const OrderModel = require("../models/order.model");
const ProductModel = require("../models/product.model");
const UserModel = require("../models/user.model");
const { successResponse, serverError_Response } = require("../utils/response");

// Get reports based on type and range
const getReports = async (req, res) => {
    try {
        const { type, range } = req.query;
        
        let startDate = new Date();
        let endDate = new Date();
        
        // Set date range
        switch(range) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'yesterday':
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'weekly':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'monthly':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'yearly':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }
        
        let reportData = {};
        
        switch(type) {
            case 'sales':
                reportData = await getSalesReport(startDate, endDate);
                break;
            case 'orders':
                reportData = await getOrdersReport(startDate, endDate);
                break;
            case 'products':
                reportData = await getProductsReport(startDate, endDate);
                break;
            case 'customers':
                reportData = await getCustomersReport(startDate, endDate);
                break;
            case 'inventory':
                reportData = await getInventoryReport();
                break;
            case 'financial':
                reportData = await getFinancialReport(startDate, endDate);
                break;
        }
        
        return res.status(200).json({
            success: true,
            message: "Report fetched successfully",
            data: reportData
        });
        
    } catch (error) {
        console.error("Get reports error:", error);
        return serverError_Response(res);
    }
};

// Sales Report
const getSalesReport = async (startDate, endDate) => {
    const orders = await OrderModel.find({
        created_at: { $gte: startDate, $lte: endDate },
        order_status: 5 // delivered
    });
    
    const totalSales = orders.reduce((sum, order) => sum + order.order_total, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const conversionRate = 5.2; // You can calculate based on visitors
    
    return { totalSales, totalOrders, avgOrderValue, conversionRate };
};

// Orders Report
const getOrdersReport = async (startDate, endDate) => {
    const pendingOrders = await OrderModel.countDocuments({ order_status: 0 });
    const processingOrders = await OrderModel.countDocuments({ order_status: 2 });
    const shippedOrders = await OrderModel.countDocuments({ order_status: 3 });
    const deliveredOrders = await OrderModel.countDocuments({ order_status: 5 });
    const cancelledOrders = await OrderModel.countDocuments({ order_status: 6 });
    
    return { pendingOrders, processingOrders, shippedOrders, deliveredOrders, cancelledOrders };
};

// Products Report
const getProductsReport = async (startDate, endDate) => {
    const topProducts = await OrderModel.aggregate([
        { $match: { created_at: { $gte: startDate, $lte: endDate } } },
        { $unwind: "$product_details" },
        {
            $group: {
                _id: "$product_details.product_id",
                soldCount: { $sum: "$product_details.qty" },
                revenue: { $sum: "$product_details.total" }
            }
        },
        { $sort: { soldCount: -1 } },
        { $limit: 10 }
    ]);
    
    // Populate product names
    const productIds = topProducts.map(p => p._id);
    const products = await ProductModel.find({ _id: { $in: productIds } }).select('name');
    
    const topProductsWithNames = topProducts.map(top => {
        const product = products.find(p => p._id.toString() === top._id.toString());
        return {
            name: product?.name || 'Unknown',
            soldCount: top.soldCount,
            revenue: top.revenue
        };
    });
    
    return { topProducts: topProductsWithNames };
};

// Customers Report
const getCustomersReport = async (startDate, endDate) => {
    const totalCustomers = await UserModel.countDocuments();
    const newCustomers = await UserModel.countDocuments({
        created_at: { $gte: startDate, $lte: endDate }
    });
    
    // Get returning customers (more than 1 order)
    const returningCustomers = await OrderModel.aggregate([
        { $group: { _id: "$user_id", orderCount: { $sum: 1 } } },
        { $match: { orderCount: { $gt: 1 } } },
        { $count: "count" }
    ]);
    
    return {
        totalCustomers,
        newCustomers,
        returningCustomers: returningCustomers[0]?.count || 0
    };
};

// Inventory Report
const getInventoryReport = async () => {
    const lowStockProducts = await ProductModel.find({ stock: false }).limit(20);
    
    return { lowStockProducts: lowStockProducts.map(p => ({ name: p.name, stock: 0 })) };
};

// Financial Report
const getFinancialReport = async (startDate, endDate) => {
    const deliveredOrders = await OrderModel.find({
        created_at: { $gte: startDate, $lte: endDate },
        order_status: 5
    });
    
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.order_total, 0);
    const totalRefunds = 0; // Add refund logic if needed
    const netRevenue = totalRevenue - totalRefunds;
    const profitMargin = 15.5; // Calculate based on cost
    
    return { totalRevenue, totalRefunds, netRevenue, profitMargin };
};

module.exports = { getReports };