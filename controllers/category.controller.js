const { allFieldsResponse, alreadyExist_Response, createdResponse, serverError_Response, successResponse, notFound_Response, updatedResponse, deleteResponse } = require("../utils/response");
const CategoryModel = require("../models/category.model");
const { createUniqueName } = require("../utils/helper");
const fs = require("fs");
const productModel = require("../models/product.model");
const { uploadToCloudinary } = require("../utils/cloudinary");

// Upload helper
const uploadImage = async (file, folder = 'ishop/categories') => {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await uploadToCloudinary(file.data, folder);
        return result.url;
    }
    const image_name = createUniqueName(file.name);
    await file.mv('./public/images/category/' + image_name);
    return image_name;
};

const create = async (req, res) => {
    try {
        if (!req.files || !req.files.category_image) return allFieldsResponse(res);
        const { name, slug } = req.body;
        if (!name || !slug) return allFieldsResponse(res);

        const existing = await CategoryModel.findOne({ slug });
        if (existing) return alreadyExist_Response(res);

        const imageUrl = await uploadImage(req.files.category_image);
        await CategoryModel.create({ name, slug, image: imageUrl });
        return createdResponse(res);
    } catch (error) {
        console.error("Category create error:", error);
        return serverError_Response(res);
    }
};

const getData = async (req, res) => {
    try {
        const query = req.query;
        const object = {};
        let limit = query.limit ? parseInt(query.limit) : 0;

        if (query.id) object["_id"] = query.id;
        if (query.status) object["status"] = query.status === "true";
        if (query.is_home) object["is_home"] = query.is_home === "true";
        if (query.is_top) object["is_top"] = query.is_top === "true";
        if (query.is_best) object["is_best"] = query.is_best === "true";

        const categories = await CategoryModel.find(object).sort({ createdAt: -1 }).limit(limit);

        const categoryData = await Promise.all(categories.map(async (c) => {
            const totalProducts = await productModel.countDocuments({ category_id: c._id });
            return { ...c.toJSON(), totalProducts };
        }));

        // imageBaseUrl empty when using Cloudinary (full URLs stored in DB)
        const imageBaseUrl = process.env.CLOUDINARY_CLOUD_NAME
            ? ''
            : `${process.env.BACKEND_URL || 'http://localhost:5000'}/images/category/`;

        return successResponse(res, "category found", { category: categoryData, imageBaseUrl });
    } catch (error) {
        console.error("Category getData error:", error);
        return serverError_Response(res);
    }
};

const statusUpdate = async (req, res) => {
    try {
        const { field } = req.body;
        const category = await CategoryModel.findById(req.params.id);
        if (!category) return notFound_Response(res);
        await CategoryModel.findByIdAndUpdate(req.params.id, { $set: { [field]: !category[field] } });
        return updatedResponse(res, `${field} Updated Successfully`);
    } catch (error) {
        return serverError_Response(res);
    }
};

const deleteById = async (req, res) => {
    try {
        const category = await CategoryModel.findById(req.params.id);
        if (!category) return notFound_Response(res);
        await CategoryModel.findByIdAndDelete(req.params.id);
        try { fs.unlinkSync(`./public/images/category/${category.image}`); } catch (_) {}
        return deleteResponse(res, "Category Deleted", category);
    } catch (error) {
        return serverError_Response(res);
    }
};

const update = async (req, res) => {
    try {
        const category = await CategoryModel.findById(req.params.id);
        if (!category) return notFound_Response(res);

        const object = {};
        if (req.body.name) { object.name = req.body.name; object.slug = req.body.slug; }

        if (req.files?.image) {
            object.image = await uploadImage(req.files.image);
        }

        await CategoryModel.updateOne({ _id: req.params.id }, { $set: object });
        return updatedResponse(res, "Category Updated");
    } catch (error) {
        console.error("Category update error:", error);
        return serverError_Response(res);
    }
};

module.exports = { create, getData, update, statusUpdate, deleteById };
