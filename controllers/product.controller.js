const { allFieldsResponse, alreadyExist_Response, createdResponse, serverError_Response, successResponse, notFound_Response, updatedResponse, deleteResponse } = require("../utils/response");
const ProductModel = require("../models/product.model");
const ColorModel = require("../models/color.model");
const categoryModel = require("../models/category.model");
const { createUniqueName } = require("../utils/helper");
const fs = require("fs");
const productModel = require("../models/product.model");
const BrandModel = require("../models/brand.model");

const create = async (req, res) => {
    try {
        const thumbnail = req.files.thumbnail
        const
            { name, slug, description, original_price, discount_price, final_price, category_id, color_ids, brand_id } = req.body;
        if (
            !name ||
            !slug ||
            !thumbnail ||
            !description ||
            !discount_price ||
            !original_price ||
            !final_price ||
            !category_id ||
            !brand_id
        ) {
            return allFieldsResponse(res);
        }

        const product = await ProductModel.findOne({ slug });
        if (product) return alreadyExist_Response(res);
        const image = createUniqueName(thumbnail.name)
        const destination = "./public/images/product/main/" + image;
        thumbnail.mv(
            destination,
            async (err) => {
                if (err) {
                    return serverError_Response(res, "image not upload")
                }
                else {
                    await ProductModel.create({
                        name,
                        slug,
                        description,
                        original_price,
                        discount_price,
                        final_price,
                        category_id,
                        color_ids: JSON.parse(color_ids),
                        brand_id,
                        thumbnail: image
                    });
                    return createdResponse(res);
                }
            })
    } catch (error) {
        console.log(error);
        return serverError_Response(res);
    }
}
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
            imageBaseUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/images/product/`
        });

    } catch (error) {
        console.log("GET PRODUCT ERROR:", error);
        return serverError_Response(res);
    }
};

const add_images = async (req, res) => {
    try {
        const images = req.files.other_images;
        const id = req.params.id;
        const product = await ProductModel.findById({ _id: id });
        if (!product) return notFound_Response(res);
        const other_images = product.other_images;
        if (Array.isArray(images) == true) {
            await Promise.all(
                images.map(async (img) => {
                    const image_name = createUniqueName(img.name)
                    const destination = "./public/images/product/other/" + image_name;
                    await img.mv(destination);
                    other_images.push(image_name);
                }))


        }
        else {
            const image_name = createUniqueName(images.name)
            const destination = "./public/images/product/other/" + image_name;
            await images.mv(destination);
            other_images.push(image_name);

        }


        product.other_images = other_images
        await product.save();
        return successResponse(res, "Images added")

    } catch (error) {
        console.log(error);
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
            const image = createUniqueName(req.files.thumbnail.name);
            const destination = "./public/images/product/main/" + image;
            await req.files.thumbnail.mv(destination);
            updateData.thumbnail = image;
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