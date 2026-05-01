const ProductModel = require("../models/product.model");
const categoryModel = require("../models/category.model");
const BrandModel = require("../models/brand.model");
const ColorModel = require("../models/color.model");
const { createUniqueName } = require("../utils/helper");
const fs = require("fs");
const { allFieldsResponse, alreadyExist_Response, createdResponse, serverError_Response, successResponse, notFound_Response, updatedResponse, deleteResponse } = require("../utils/response");
const logActivity = require("../utils/logActivity");

// Get all products (Admin view with all data)
const getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (status !== undefined) {
            query.status = status === 'true';
        }
        
        const products = await ProductModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('category_id', 'name slug')
            .populate('brand_id', 'name slug')
            .populate('color_ids', 'name color_code');
        
        const total = await ProductModel.countDocuments(query);
        
        return successResponse(res, "Products fetched", {
            products,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Get all products error:", error);
        return serverError_Response(res);
    }
};

// Create product (Admin)
const createProduct = async (req, res) => {
    try {
        const thumbnail = req.files?.thumbnail;
        const { name, slug, description, original_price, discount_price, final_price, category_id, color_ids, brand_id, stock, is_best_seller, show_home, is_featured, is_hot } = req.body;
        
        if (!name || !slug || !thumbnail || !original_price || !final_price || !category_id || !brand_id) {
            return allFieldsResponse(res);
        }
        
        const existingProduct = await ProductModel.findOne({ slug });
        if (existingProduct) return alreadyExist_Response(res);
        
        const image = createUniqueName(thumbnail.name);
        const destination = "./public/images/product/main/" + image;
        
        thumbnail.mv(destination, async (err) => {
            if (err) {
                return serverError_Response(res, "Image upload failed");
            }
            
            const product = await ProductModel.create({
                name,
                slug,
                description,
                original_price,
                discount_price: discount_price || 0,
                final_price,
                category_id,
                color_ids: color_ids ? JSON.parse(color_ids) : [],
                brand_id,
                thumbnail: image,
                stock: stock === 'true',
                is_best_seller: is_best_seller === 'true',
                show_home: show_home === 'true',
                is_featured: is_featured === 'true',
                is_hot: is_hot === 'true'
            });
            
            // Log activity
            await logActivity(req, 'CREATE_PRODUCT', { product_id: product._id, product_name: name });
            
            return createdResponse(res, "Product created successfully");
        });
    } catch (error) {
        console.error("Create product error:", error);
        return serverError_Response(res);
    }
};

// Update product (Admin)
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductModel.findById(id);
        if (!product) return notFound_Response(res);
        
        const updateData = {};
        
        if (req.body.name) updateData.name = req.body.name;
        if (req.body.slug) updateData.slug = req.body.slug;
        if (req.body.description) updateData.description = req.body.description;
        if (req.body.original_price) updateData.original_price = req.body.original_price;
        if (req.body.discount_price) updateData.discount_price = req.body.discount_price;
        if (req.body.final_price) updateData.final_price = req.body.final_price;
        if (req.body.category_id) updateData.category_id = req.body.category_id;
        if (req.body.brand_id) updateData.brand_id = req.body.brand_id;
        if (req.body.stock !== undefined) updateData.stock = req.body.stock === 'true';
        if (req.body.status !== undefined) updateData.status = req.body.status === 'true';
        if (req.body.is_best_seller !== undefined) updateData.is_best_seller = req.body.is_best_seller === 'true';
        if (req.body.show_home !== undefined) updateData.show_home = req.body.show_home === 'true';
        if (req.body.is_featured !== undefined) updateData.is_featured = req.body.is_featured === 'true';
        if (req.body.is_hot !== undefined) updateData.is_hot = req.body.is_hot === 'true';
        
        if (req.body.color_ids) {
            updateData.color_ids = JSON.parse(req.body.color_ids);
        }
        
        // Thumbnail update
        if (req.files?.thumbnail) {
            const image = createUniqueName(req.files.thumbnail.name);
            const destination = "./public/images/product/main/" + image;
            await req.files.thumbnail.mv(destination);
            updateData.thumbnail = image;
        }
        
        await ProductModel.findByIdAndUpdate(id, { $set: updateData });
        
        // Log activity
        await logActivity(req, 'UPDATE_PRODUCT', { product_id: id, updates: Object.keys(updateData) });
        
        return updatedResponse(res, "Product updated successfully");
    } catch (error) {
        console.error("Update product error:", error);
        return serverError_Response(res);
    }
};

// Delete product (Admin)
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductModel.findById(id);
        if (!product) return notFound_Response(res);
        
        // Delete thumbnail
        if (product.thumbnail) {
            const thumbPath = `./public/images/product/main/${product.thumbnail}`;
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        }
        
        // Delete other images
        if (product.other_images && product.other_images.length > 0) {
            for (const img of product.other_images) {
                const imgPath = `./public/images/product/other/${img}`;
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }
        }
        
        await ProductModel.findByIdAndDelete(id);
        
        // Log activity
        await logActivity(req, 'DELETE_PRODUCT', { product_id: id, product_name: product.name });
        
        return deleteResponse(res, "Product deleted successfully");
    } catch (error) {
        console.error("Delete product error:", error);
        return serverError_Response(res);
    }
};

// Update product status (stock, active, etc)
const updateProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { field } = req.body;
        
        const product = await ProductModel.findById(id);
        if (!product) return notFound_Response(res);
        
        const validFields = ['status', 'stock', 'is_best_seller', 'show_home', 'is_featured', 'is_hot'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ success: false, message: "Invalid field" });
        }
        
        product[field] = !product[field];
        await product.save();
        
        await logActivity(req, 'UPDATE_PRODUCT_STATUS', { product_id: id, field, new_value: product[field] });
        
        return updatedResponse(res, `${field} updated successfully`);
    } catch (error) {
        console.error("Update product status error:", error);
        return serverError_Response(res);
    }
};

module.exports = {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateProductStatus
};