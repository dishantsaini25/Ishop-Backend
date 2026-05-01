const categoryRouter = require("express").Router();
const { create, getData, update, statusUpdate, deleteById } = require("../controllers/category.controller");
const fileupload = require("express-fileupload")

categoryRouter.post("/create", fileupload({ createParentPath: true }), create)
categoryRouter.get("/", getData)
categoryRouter.put("/update/:id",fileupload({ createParentPath: true }),update);
categoryRouter.patch("/status/:id", statusUpdate)
categoryRouter.delete("/delete/:id", deleteById)




module.exports = categoryRouter;