const { allFieldsResponse, alreadyExist_Response, createdResponse, serverError_Response, successResponse, notFound_Response, updatedResponse, deleteResponse } = require("../utils/response");
const CategoryModel = require("../models/category.model");
const { createUniqueName } = require("../utils/helper");
const fs = require("fs");
const productModel = require("../models/product.model");

const create = async (req, res) => {
    try {
        const category_image = req.files.category_image;
        const { name, slug } = req.body;
        if (!name || !slug || !category_image) return allFieldsResponse(res);
        const category = await CategoryModel.findOne({ slug });
        if (category) return alreadyExist_Response(res);
        const image = createUniqueName(category_image.name)
        const destination = "./public/images/category/" + image;
        category_image.mv(
            destination,
            async (err) => {
                if (err) {
                    return serverError_Response(res, "image not upload")
                }
                else {
                    await CategoryModel.create({ name, slug, image });
                    return createdResponse(res);
                }
            })
    } catch (error) {
        console.log(error);
        return serverError_Response(res);
    }
}

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

        const categories = await CategoryModel
            .find(object)
            .sort({ createdAt: -1 })
            .limit(limit);

        const categoryData = [];

        for (let c of categories) {

            const productCount = await productModel.countDocuments({
                category_id: c._id
            });

            categoryData.push({
                ...c.toJSON(),
                totalProducts: productCount
            });

        }
        return successResponse(res, "category found", {
            category: categoryData,
            imageBaseUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/images/category/`
        });

    } catch (error) {

        console.log(error);
        return serverError_Response(res);

    }
};




const statusUpdate = async (req, res) => {
    try {
        const { field } = req.body
        const id = req.params.id;
        const category = await CategoryModel.findById(id);
        if (!category) return notFound_Response(res);
        const msg = `${field} Updated Successfully`
        await CategoryModel.findByIdAndUpdate(id, {
            $set: {
                [field]: !category[field]
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
        const category = await CategoryModel.findById(id);
        if (!category) return notFound_Response(res);
        await CategoryModel.findByIdAndDelete(id)
        await fs.unlinkSync(`./public/images/category/${category.image}`)
        return deleteResponse(res, "Category Delete ", category)
    } catch (error) {
        console.log(error)
        return serverError_Response(res)
    }
}


const update = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await CategoryModel.findById(id);
        if (!category) return notFound_Response(res);

        const object = {};

        if (req.body.name) {
            object.name = req.body.name;
            object.slug = req.body.slug;
        }

        if (req.files && req.files.image) {
            const image = req.files.image;
            const category_image = createUniqueName(image.name);
            const destination = "./public/images/category/" + category_image;


            await image.mv(destination);
            await fs.unlinkSync(`./public/images/category/${category.image}`);
            object.image = category_image;
        }

        await CategoryModel.updateOne(
            { _id: id },
            { $set: object }
        );

        return updatedResponse(res, "Category Updated");

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
}