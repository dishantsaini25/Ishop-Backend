const {
  allFieldsResponse, alreadyExist_Response, createdResponse,
  serverError_Response, successResponse, notFound_Response,
  updatedResponse, deleteResponse
} = require("../utils/response");

const BrandModel = require("../models/brand.model");
const { createUniqueName } = require("../utils/helper");
const fs = require("fs");
const productModel = require("../models/product.model");
const categoryModel = require("../models/category.model");
const { uploadToCloudinary } = require("../utils/cloudinary");

// Upload helper - Cloudinary in production, local in dev
const uploadImage = async (file, folder = 'ishop/brands') => {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    const result = await uploadToCloudinary(file.data, folder);
    return result.url;
  }
  const image_name = createUniqueName(file.name);
  await file.mv('./public/images/brand/' + image_name);
  return image_name;
};

/* ── CREATE ── */
const create = async (req, res) => {
  try {
    if (!req.files || !req.files.image) return allFieldsResponse(res);

    const { name, slug } = req.body;
    if (!name || !slug) return allFieldsResponse(res);

    const existing = await BrandModel.findOne({ slug });
    if (existing) return alreadyExist_Response(res);

    let category_ids = [];
    if (req.body.category_ids) category_ids = JSON.parse(req.body.category_ids);

    const imageUrl = await uploadImage(req.files.image);

    await BrandModel.create({ name, slug, image: imageUrl, category_ids });
    return createdResponse(res);
  } catch (error) {
    console.error("Brand create error:", error);
    return serverError_Response(res);
  }
};

/* ── GET ── */
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

    if (query.category_slug) {
      const category = await categoryModel.findOne({ slug: query.category_slug });
      if (category) object["category_ids"] = { $in: [category._id] };
    }

    const brands = await BrandModel.find(object)
      .populate("category_ids")
      .sort({ createdAt: -1 })
      .limit(limit);

    const brandData = await Promise.all(brands.map(async (b) => {
      const productCount = await productModel.countDocuments({ brand_id: b._id });
      return { ...b.toJSON(), productCount };
    }));

    // imageBaseUrl empty when using Cloudinary (full URLs stored)
    const imageBaseUrl = process.env.CLOUDINARY_CLOUD_NAME
      ? ''
      : `${process.env.BACKEND_URL || 'http://localhost:5000'}/images/brand/`;

    return successResponse(res, "Brand Found", { brand: brandData, imageBaseUrl });
  } catch (error) {
    console.error("Brand getData error:", error);
    return serverError_Response(res);
  }
};

/* ── STATUS UPDATE ── */
const statusUpdate = async (req, res) => {
  try {
    const { field } = req.body;
    const brand = await BrandModel.findById(req.params.id);
    if (!brand) return notFound_Response(res);
    await BrandModel.findByIdAndUpdate(req.params.id, { $set: { [field]: !brand[field] } });
    return updatedResponse(res, `${field} Updated Successfully`);
  } catch (error) {
    return serverError_Response(res);
  }
};

/* ── DELETE ── */
const deleteById = async (req, res) => {
  try {
    const brand = await BrandModel.findById(req.params.id);
    if (!brand) return notFound_Response(res);
    await BrandModel.findByIdAndDelete(req.params.id);
    // Try local delete (no-op if Cloudinary)
    try { fs.unlinkSync(`./public/images/brand/${brand.image}`); } catch (_) {}
    return deleteResponse(res, "Brand Deleted", brand);
  } catch (error) {
    return serverError_Response(res);
  }
};

/* ── UPDATE ── */
const update = async (req, res) => {
  try {
    const brand = await BrandModel.findById(req.params.id);
    if (!brand) return notFound_Response(res);

    const object = {};
    if (req.body.name) { object.name = req.body.name; object.slug = req.body.slug; }
    if (req.body.category_ids) object.category_ids = JSON.parse(req.body.category_ids);

    if (req.files?.image) {
      object.image = await uploadImage(req.files.image);
    }

    await BrandModel.updateOne({ _id: req.params.id }, { $set: object });
    return updatedResponse(res, "Brand Updated");
  } catch (error) {
    console.error("Brand update error:", error);
    return serverError_Response(res);
  }
};

module.exports = { create, getData, update, statusUpdate, deleteById };
