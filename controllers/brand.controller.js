const {
  allFieldsResponse,
  alreadyExist_Response,
  createdResponse,
  serverError_Response,
  successResponse,
  notFound_Response,
  updatedResponse,
  deleteResponse
} = require("../utils/response");

const BrandModel = require("../models/brand.model");
const { createUniqueName } = require("../utils/helper");
const fs = require("fs");
const productModel = require("../models/product.model");
const categoryModel = require("../models/category.model");

/* ================= CREATE ================= */
const create = async (req, res) => {
  try {

    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    // ❗ SAFE CHECK (IMPORTANT)
    if (!req.files || !req.files.image) {
      return allFieldsResponse(res);
    }

    const brand_image = req.files.image;
    const { name, slug } = req.body;

    let category_ids = [];

    if (req.body.category_ids) {
      category_ids = JSON.parse(req.body.category_ids);
    }

    if (!name || !slug) {
      return allFieldsResponse(res);
    }

    const brand = await BrandModel.findOne({ slug });
    if (brand) {
      return alreadyExist_Response(res);
    }

    const image = createUniqueName(brand_image.name);
    const destination = "./public/images/brand/" + image;

    brand_image.mv(destination, async (err) => {
      if (err) {
        console.log("IMAGE ERROR:", err);
        return serverError_Response(res, "image not upload");
      }

      await BrandModel.create({
        name,
        slug,
        image,
        category_ids
      });

      return createdResponse(res);
    });

  } catch (error) {
    console.log(error);
    return serverError_Response(res);
  }
};





/* ================= GET ================= */
const getData = async (req, res) => {
  try {

    const query = req.query;
    const object = {};

    let limit = query.limit ? parseInt(query.limit) : 0;

    if (query.id)
      object["_id"] = query.id;

    if (query.status)
      object["status"] = query.status === "true";

    if (query.is_home)
      object["is_home"] = query.is_home === "true";

    if (query.is_top)
      object["is_top"] = query.is_top === "true";

    if (query.is_best)
      object["is_best"] = query.is_best === "true";



    if (query.category_slug) {

      const category = await categoryModel.findOne({
        slug: query.category_slug
      });

      if (category) {
        object["category_ids"] = { $in: [category._id] };
      }

    }

    const brands = await BrandModel.find(object)
      .populate("category_ids")
      .sort({ createdAt: -1 })
      .limit(limit);

    const brandData = [];

    for (let b of brands) {

      const productCount = await productModel.countDocuments({
        brand_id: b._id
      });

      brandData.push({
        ...b.toJSON(),
        productCount
      });

    }

    return successResponse(res, "Brand Found", {
      brand: brandData,
      imageBaseUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/images/brand/`
    });

  } catch (error) {
    console.log(error);
    return serverError_Response(res);
  }
};



/* ================= STATUS UPDATE ================= */
const statusUpdate = async (req, res) => {
  try {
    const { field } = req.body;
    const id = req.params.id;

    const brand = await BrandModel.findById(id);
    if (!brand) return notFound_Response(res);

    await BrandModel.findByIdAndUpdate(id, {
      $set: {
        [field]: !brand[field]
      }
    });

    return updatedResponse(res, `${field} Updated Successfully`);
  } catch (error) {
    return serverError_Response(res);
  }
};

/* ================= DELETE ================= */
const deleteById = async (req, res) => {
  try {
    const id = req.params.id;
    const brand = await BrandModel.findById(id);
    if (!brand) return notFound_Response(res);

    await BrandModel.findByIdAndDelete(id);

    try {
      fs.unlinkSync(`./public/images/brand/${brand.image}`);
    } catch (err) {
      // ignore unlink error
    }

    return deleteResponse(res, "Brand Deleted", brand);
  } catch (error) {
    console.log(error);
    return serverError_Response(res);
  }
};

/* ================= UPDATE ================= */
const update = async (req, res) => {
  try {
    const id = req.params.id;
    const brand = await BrandModel.findById(id);
    if (!brand) return notFound_Response(res);

    const object = {};

    if (req.body.name) {
      object.name = req.body.name;
      object.slug = req.body.slug;
    }

    if (req.body.category_ids) {
      object.category_ids = JSON.parse(req.body.category_ids);
    }

    if (req.files && req.files.image) {
      const image = req.files.image;
      const newImage = createUniqueName(image.name);
      const destination = "./public/images/brand/" + newImage;

      await image.mv(destination);

      try {
        fs.unlinkSync(`./public/images/brand/${brand.image}`);
      } catch (err) {
        // ignore unlink error
      }

      object.image = newImage;
    }

    await BrandModel.updateOne(
      { _id: id },
      { $set: object }
    );

    return updatedResponse(res, "Brand Updated");
  } catch (error) {
    console.log(error);
    return serverError_Response(res);
  }
};

module.exports = {
  create,
  getData,
  update,
  statusUpdate,
  deleteById
};
