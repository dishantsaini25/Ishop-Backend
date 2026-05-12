const { allFieldsResponse, alreadyExist_Response, createdResponse, serverError_Response, successResponse, notFound_Response, updatedResponse, deleteResponse } = require("../utils/response");
const ProductModel = require("../models/product.model");
const ColorModel = require("../models/color.model");
const categoryModel = require("../models/category.model");
const { createUniqueName } = require("../utils/helper");
const fs = require("fs");
const path = require("path");
const productModel = require("../models/product.model");
const BrandModel = require("../models/brand.model");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");

// Ensure upload directories exist (for local dev)
const ensureDirs = () => {
    const dirs = [
        "./public/images/product/main",
        "./public/images/product/other",
        "./public/images/category",
        "./public/images/brand",
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};
ensureDirs();

// Helper: upload image - uses Cloudinary if configured, local otherwise
const uploadImage = async (file, folder) => {
    const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
                          process.env.CLOUDINARY_API_KEY && 
                          process.env.CLOUDINARY_API_SECRET &&
                          process.env.CLOUDINARY_CLOUD_NAME !== 'Ishop'; // guard against wrong value
    
    if (hasCloudinary) {
        try {
            const result = await uploadToCloudinary(file.data, folder);
            console.log('✓ Uploaded to Cloudinary:', result.url);
            return { name: result.url, isCloudinary: true };
        } catch (cloudErr) {
            console.error('Cloudinary upload failed, falling back to local:', cloudErr.message);
        }
    }
    
    // Local storage fallback
    const image_name = createUniqueName(file.name);
    const isMain = folder.includes('main');
    const isOther = folder.includes('other');
    const isBrand = folder.includes('brand');
    const isCat = folder.includes('categor');
    
    let localPath;
    if (isMain) localPath = './public/images/product/main/';
    else if (isOther) localPath = './public/images/product/other/';
    else if (isBrand) localPath = './public/images/brand/';
    else if (isCat) localPath = './public/images/category/';
    else localPath = './public/images/';
    
    await file.mv(localPath + image_name);
    console.log('✓ Saved locally:', localPath + image_name);
    return { name: image_name, isCloudinary: false };
};

const create = async (req, res) => {
    try {
        if (!req.files || !req.files.thumbnail) {
            return allFieldsResponse(res);
        }
        const thumbnail = req.files.thumbnail;
        const { name, slug, description, original_price, discount_price, final_price, category_id, color_ids, brand_id } = req.body;

        if (!name || !slug || !description || !discount_price || !original_price || !final_price || !category_id || !brand_id) {
            return allFieldsResponse(res);
        }

        const existing = await ProductModel.findOne({ slug });
        if (existing) return alreadyExist_Response(res);

        const uploaded = await uploadImage(thumbnail, 'ishop/products/main');

        await ProductModel.create({
            name, slug, description,
            original_price, discount_price, final_price,
            category_id, brand_id,
            color_ids: color_ids ? JSON.parse(color_ids) : [],
            thumbnail: uploaded.name,
        });

        return createdResponse(res);
    } catch (error) {
        console.error("Create product error:", error);
        return serverError_Response(res);
    }
};
// const getData = async (req, res) => {
//     try {
//         const query = req.query;
//         const object = {};
//         const sortedBy = {};
//         let page = parseInt(query.page) || 1;
//         let perPage = 12;
//         let skip = (page - 1) * perPage;
//         if (query.id) object["_id"] = query.id;
        

//         if (query.status !== undefined)
//             object["status"] = query.status === "true";

//         if (query.stock !== undefined)
//             object["stock"] = query.stock === "true";

//         if (query.is_best_seller !== undefined)
//             object["is_best_seller"] = query.is_best_seller === "true";

//         if (query.show_home !== undefined)
//             object["show_home"] = query.show_home === "true";

//         if (query.is_featured !== undefined)
//             object["is_featured"] = query.is_featured === "true";

//         if (query.is_hot !== undefined)
//             object["is_hot"] = query.is_hot === "true";
//       if (query.category_slug) { const category = await categoryModel.findOne({ slug: query.category_slug }); if (category) object["category_id"] = category._id; }

//         if (query.brand_slug) {
//             const brand = await BrandModel.findOne({
//                 slug: { $regex: `^${query.brand_slug}$`, $options: "i" }
//             });

//             if (brand) object["brand_id"] = brand._id;
//         }



//         if (query.color_slug) {
//             const slugArray = query.color_slug.split(",");

//             const colors = await ColorModel.find({
//                 slug: { $in: slugArray }
//             });

//             const colorIds = colors.map(c => c._id);

//             if (colorIds.length > 0) {
//                 object["color_ids"] = { $in: colorIds };
//             }
//         }



//         if (query.min_price || query.max_price) {
//             const priceFilter = {};

//             if (query.min_price) {
//                 priceFilter.$gte = Number(query.min_price);
//             }

//             if (query.max_price) {
//                 priceFilter.$lte = Number(query.max_price);
//             }

//             object["final_price"] = priceFilter;
//         }


//         if (query.sort === "asc") {
//             sortedBy["final_price"] = 1;
//         } else if (query.sort === "desc") {
//             sortedBy["final_price"] = -1;
//         } else {
//             sortedBy["createdAt"] = -1;
//         }

    

//         const total = await ProductModel.countDocuments(object);


//         const maxPriceData = await ProductModel.aggregate([
//             {
//                 $group: {
//                     _id: null,
//                     maxPrice: { $max: "$final_price" }
//                 }
//             }
//         ]);

//         const maxPrice = maxPriceData[0]?.maxPrice || 0;

//         const product = await ProductModel.find(object)
//             .sort(sortedBy)
//             .skip(skip)
//             .limit(perPage)
//             .populate([
//                 {
//                     path: "category_id",
//                     select: "_id name slug"
//                 },
//                 {
//                     path: "color_ids",
//                     select: "_id name slug color_code"
//                 },
//                 {
//                     path: "brand_id",
//                     select: "_id name slug"
//                 }
//             ]);


//         return successResponse(res, "Product found", {
//             product,
//             total,
//             currentPage: page,
//             totalPages: Math.ceil(total / perPage),
//             maxPrice,
//             imageBaseUrl: "http://localhost:5000/images/product/"
//         });

//     } catch (error) {
//         console.log("GET PRODUCT ERROR:", error);
//         return serverError_Response(res);
//     }
// };



const getData = async (req, res) => {
    try {
        const query = req.query;
        const object = {};
        const sortedBy = {};
        let page = parseInt(query.page) || 1;
        let perPage = 12;
        let skip = (page - 1) * perPage;
        
        // ✅ FIX: Add slug filter
        if (query.slug) {
            object["slug"] = query.slug;  // Exact match for slug
        }
        
        if (query.id) object["_id"] = query.id;

        if (query.status !== undefined)
            object["status"] = query.status === "true";

        if (query.stock !== undefined)
            object["stock"] = query.stock === "true";

        if (query.is_best_seller !== undefined)
            object["is_best_seller"] = query.is_best_seller === "true";

        if (query.show_home !== undefined)
            object["show_home"] = query.show_home === "true";

        if (query.is_featured !== undefined)
            object["is_featured"] = query.is_featured === "true";

        if (query.is_hot !== undefined)
            object["is_hot"] = query.is_hot === "true";
            
        if (query.category_slug) { 
            const category = await categoryModel.findOne({ slug: query.category_slug }); 
            if (category) object["category_id"] = category._id; 
        }

        if (query.brand_slug) {
            const brand = await BrandModel.findOne({
                slug: { $regex: `^${query.brand_slug}$`, $options: "i" }
            });
            if (brand) object["brand_id"] = brand._id;
        }

        if (query.color_slug) {
            const slugArray = query.color_slug.split(",");
            const colors = await ColorModel.find({ slug: { $in: slugArray } });
            const colorIds = colors.map(c => c._id);
            if (colorIds.length > 0) {
                object["color_ids"] = { $in: colorIds };
            }
        }

        if (query.min_price || query.max_price) {
            const priceFilter = {};
            if (query.min_price) priceFilter.$gte = Number(query.min_price);
            if (query.max_price) priceFilter.$lte = Number(query.max_price);
            object["final_price"] = priceFilter;
        }

        if (query.sort === "asc") {
            sortedBy["final_price"] = 1;
        } else if (query.sort === "desc") {
            sortedBy["final_price"] = -1;
        } else {
            sortedBy["createdAt"] = -1;
        }

        // ✅ If slug is provided, get single product without pagination
        let product;
        let total;
        let maxPrice;
        
        if (query.slug) {
            // For single product - no pagination
            product = await ProductModel.findOne(object)
                .populate([
                    { path: "category_id", select: "_id name slug" },
                    { path: "color_ids", select: "_id name slug color_code" },
                    { path: "brand_id", select: "_id name slug" }
                ]);
            
            total = product ? 1 : 0;
            
            // Convert single product to array for consistent response
            product = product ? [product] : [];
            
            // Get max price for filter (keep it)
            const maxPriceData = await ProductModel.aggregate([
                { $group: { _id: null, maxPrice: { $max: "$final_price" } } }
            ]);
            maxPrice = maxPriceData[0]?.maxPrice || 0;
            
        } else {
            // For multiple products - with pagination
            total = await ProductModel.countDocuments(object);
            
            const maxPriceData = await ProductModel.aggregate([
                { $group: { _id: null, maxPrice: { $max: "$final_price" } } }
            ]);
            maxPrice = maxPriceData[0]?.maxPrice || 0;
            
            product = await ProductModel.find(object)
                .sort(sortedBy)
                .skip(skip)
                .limit(perPage)
                .populate([
                    { path: "category_id", select: "_id name slug" },
                    { path: "color_ids", select: "_id name slug color_code" },
                    { path: "brand_id", select: "_id name slug" }
                ]);
        }

        console.log("Query params:", query);
        console.log("Products found:", product?.length);
        console.log("Object filter:", object);

        return successResponse(res, "Product found", {
            product,
            total,
            currentPage: query.slug ? 1 : page,
            totalPages: query.slug ? 1 : Math.ceil(total / perPage),
            maxPrice,
            imageBaseUrl: process.env.CLOUDINARY_CLOUD_NAME ? "" : `${process.env.BACKEND_URL || 'http://localhost:5000'}/images/product/`
        });

    } catch (error) {
        console.log("GET PRODUCT ERROR:", error);
        return serverError_Response(res);
    }
};

const add_images = async (req, res) => {
    try {
        console.log("=== ADD IMAGES REQUEST ===");
        console.log("Product ID:", req.params.id);
        console.log("Has files:", !!req.files);
        console.log("Files keys:", req.files ? Object.keys(req.files) : 'none');

        if (!req.files || !req.files.other_images) {
            return res.status(400).json({
                success: false,
                message: "No images uploaded. Please select at least one image."
            });
        }

        const images = req.files.other_images;
        const id = req.params.id;
        const product = await ProductModel.findById(id);
        if (!product) return notFound_Response(res);

        const other_images = [...product.other_images];

        const saveImage = async (img) => {
            const uploaded = await uploadImage(img, 'ishop/products/other');
            other_images.push(uploaded.name);
        };

        if (Array.isArray(images)) {
            await Promise.all(images.map(saveImage));
        } else {
            await saveImage(images);
        }

        product.other_images = other_images;
        await product.save();
        return successResponse(res, "Images added successfully");

    } catch (error) {
        console.error("Add images error:", error);
        return serverError_Response(res);
    }
};

const statusUpdate = async (req, res) => {
    try {
        const { field } = req.body
        const id = req.params.id;
        const product = await ProductModel.findById(id);
        if (!product) return notFound_Response(res);
        const msg = `${field} Updated Successfully`
        await ProductModel.findByIdAndUpdate(id, {
            $set: {
                [field]: !product[field]
            }
        });
        return updatedResponse(res, msg);
    } catch (error) {
        return serverError_Response(res)
    }
}
const deleteById = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await ProductModel.findById(id);
        if (!product) return notFound_Response(res);
        await ProductModel.findByIdAndDelete(id)
        await fs.unlinkSync(`./public/images/product/main/${product.thumbnail}`)
        if (product.other_images && product.other_images.length > 0) {
            for (const img of product.other_images) {
                await fs.unlinkSync(`./public/images/product/other/${img}`);
            }
        }
        return deleteResponse(res, "Product Delete ", product)
    } catch (error) {
        console.log(error)
        return serverError_Response(res)
    }
}


const deleteOtherImages = async (req, res) => {
    try {
        const { productId } = req.params;
        const { imageName } = req.query;

        const product = await ProductModel.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product Not Found"
            });
        }

        if (imageName) {

            product.other_images = product.other_images.filter(
                (img) => img !== imageName
            );

            const path = `./public/images/product/other/${imageName}`;
            if (fs.existsSync(path)) {
                fs.unlinkSync(path);
            }

            await product.save();

            return res.json({
                success: true,
                message: "Image Deleted Successfully"
            });
        }


        product.other_images.forEach((img) => {
            const path = `./public/images/product/other/${img}`;
            if (fs.existsSync(path)) {
                fs.unlinkSync(path);
            }
        });

        product.other_images = [];
        await product.save();

        return res.json({
            success: true,
            message: "All Images Deleted Successfully"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

const update = async (req, res) => {
    try {
        const id = req.params.id;

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

        if (req.body.color_ids) {
            updateData.color_ids = JSON.parse(req.body.color_ids);
        }

        // Thumbnail update
        if (req.files?.thumbnail) {
            const uploaded = await uploadImage(req.files.thumbnail, 'ishop/products/main');
            updateData.thumbnail = uploaded.name;
        }

        await ProductModel.findByIdAndUpdate(id, { $set: updateData });

        return updatedResponse(res, "Product Updated Successfully");

    } catch (error) {
        console.log(error);
        return serverError_Response(res);
    }
};







const getDealOfDay = async (req, res) => {
    try {
        const now = new Date();
        const deal = await ProductModel.findOne({
            'deal_of_day.is_deal': true,
            'deal_of_day.deal_end_time': { $gt: now },
            status: true,
            stock: true
        })
        .populate([
            { path: "category_id", select: "_id name slug" },
            { path: "brand_id", select: "_id name slug" },
            { path: "color_ids", select: "_id name slug color_code" }
        ]);

        if (!deal) {
            return successResponse(res, "No active deal", { deal: null });
        }

        return successResponse(res, "Deal found", {
            deal,
            imageBaseUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/images/product/`
        });
    } catch (error) {
        console.log("GET DEAL ERROR:", error);
        return serverError_Response(res);
    }
};

const updateDealOfDay = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_deal, deal_end_time, deal_discount_percent, total_stock_for_deal } = req.body;

        const product = await ProductModel.findById(id);
        if (!product) return notFound_Response(res);

        await ProductModel.findByIdAndUpdate(id, {
            $set: {
                'deal_of_day.is_deal': is_deal ?? product.deal_of_day.is_deal,
                'deal_of_day.deal_end_time': deal_end_time || product.deal_of_day.deal_end_time,
                'deal_of_day.deal_discount_percent': deal_discount_percent ?? product.deal_of_day.deal_discount_percent,
                'deal_of_day.total_stock_for_deal': total_stock_for_deal ?? product.deal_of_day.total_stock_for_deal,
            }
        });

        return updatedResponse(res, "Deal updated successfully");
    } catch (error) {
        console.log("UPDATE DEAL ERROR:", error);
        return serverError_Response(res);
    }
};

module.exports = {
    create,
    getData,
    getDealOfDay,
    updateDealOfDay,
    add_images,
    statusUpdate,
    deleteById,
    deleteOtherImages,
    update
}