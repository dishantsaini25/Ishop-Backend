const ProductModel = require("../models/product.model");
const { successResponse, serverError_Response, notFound_Response } = require("../utils/response");

// GET active deals for homepage
const getDeals = async (req, res) => {
    try {
        const now = new Date();

        const deals = await ProductModel.find({
            "deal_of_day.is_deal": true,
            "deal_of_day.deal_end_time": { $gt: now },
            status: true,
            stock: true
        })
        .populate([
            { path: "category_id", select: "_id name slug" },
            { path: "brand_id", select: "_id name slug" }
        ])
        .sort({ "deal_of_day.deal_end_time": 1 })
        .limit(10);

        const imageBaseUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/images/product/`;

        return successResponse(res, "Deals fetched", { deals, imageBaseUrl });
    } catch (error) {
        console.error("Get deals error:", error);
        return serverError_Response(res);
    }
};

// ADMIN: Set deal on a product
const setDeal = async (req, res) => {
    try {
        const { product_id } = req.params;
        const { is_deal, deal_end_time, deal_discount_percent, total_stock_for_deal } = req.body;

        const product = await ProductModel.findById(product_id);
        if (!product) return notFound_Response(res, "Product not found");

        product.deal_of_day = {
            is_deal: is_deal ?? false,
            deal_end_time: deal_end_time ? new Date(deal_end_time) : null,
            deal_discount_percent: deal_discount_percent || 0,
            sold_count: product.deal_of_day?.sold_count || 0,
            total_stock_for_deal: total_stock_for_deal || 0
        };

        await product.save();

        return successResponse(res, "Deal updated successfully", product.deal_of_day);
    } catch (error) {
        console.error("Set deal error:", error);
        return serverError_Response(res);
    }
};

// ADMIN: Get all products with deal info
const getAllDeals = async (req, res) => {
    try {
        const products = await ProductModel.find({ "deal_of_day.is_deal": true })
            .select("name thumbnail final_price original_price deal_of_day status stock")
            .sort({ "deal_of_day.deal_end_time": 1 });

        const imageBaseUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/images/product/`;

        return successResponse(res, "All deals fetched", { products, imageBaseUrl });
    } catch (error) {
        return serverError_Response(res);
    }
};

// ADMIN: Remove deal from product
const removeDeal = async (req, res) => {
    try {
        const { product_id } = req.params;
        await ProductModel.findByIdAndUpdate(product_id, {
            $set: {
                "deal_of_day.is_deal": false,
                "deal_of_day.deal_end_time": null,
                "deal_of_day.deal_discount_percent": 0,
                "deal_of_day.total_stock_for_deal": 0
            }
        });
        return successResponse(res, "Deal removed");
    } catch (error) {
        return serverError_Response(res);
    }
};

module.exports = { getDeals, setDeal, getAllDeals, removeDeal };
