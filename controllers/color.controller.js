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

const ColorModel = require("../models/color.model");
const productModel = require("../models/product.model");

/* ================= CREATE ================= */
const create = async (req, res) => {
  try {
    const { name, slug, color_code } = req.body;
    if (!name || !slug || !color_code) return allFieldsResponse(res);

    const exist = await ColorModel.findOne({
      $or: [{ slug }, { color_code }]
    });
    if (exist) return alreadyExist_Response(res);

    await ColorModel.create({ name, slug, color_code });
    return createdResponse(res, "Color Created");
  } catch (error) {
    console.log(error);
    return serverError_Response(res);
  }
};
const getData = async (req, res) => {
  try {
    const query = req.query;
    const object = {};
    let limit = query.limit ? parseInt(query.limit) : 0;
        if (query.id) object["_id"] = query.id
        if (query.status) object["status"] = query.status == "true" ? true : false
    const colors = await ColorModel.find(object).sort({ createdAt: -1 }).limit(limit);
    const colorData = [];
    for (let c of colors) {
    const productCount = await productModel.countDocuments({
        color_ids: { $in: [c._id] }   // ✅ array me id
      });

      colorData.push({
        ...c.toJSON(),
        productCount,
      });
    }
    return successResponse(res, "Colors Found", { colors: colorData });
  } catch (error) {
    return serverError_Response(res);
  }
};

const statusUpdate = async (req, res) => {
  try {
    const id = req.params.id;
    const color = await ColorModel.findById(id);
    if (!color) return notFound_Response(res);

    color.status = !color.status;
    await color.save();

    return updatedResponse(res, "Status Updated");
  } catch (error) {
    return serverError_Response(res);
  }
};
const update = async (req, res) => {
  try {
    const id = req.params.id;
    const color = await ColorModel.findById(id);
    if (!color) return notFound_Response(res);

    const object = {};
    if (req.body.name) {
      object.name = req.body.name;
      object.slug = req.body.slug;
    }
    if (req.body.color_code) {
      object.color_code = req.body.color_code;
    }

    await ColorModel.updateOne(
      { _id: id },
      { $set: object }
    );

    return updatedResponse(res, "Color Updated");
  } catch (error) {
    console.log(error);
    return serverError_Response(res);
  }
};

const deleteById = async (req, res) => {
  try {
    const id = req.params.id;
    const color = await ColorModel.findById(id);
    if (!color) return notFound_Response(res);

    await ColorModel.findByIdAndDelete(id);
    return deleteResponse(res, "Color Deleted", color);
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
