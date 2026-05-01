const colorRouter = require("express").Router();
const { create, getData, update, statusUpdate, deleteById } = require("../controllers/color.controller");


colorRouter.post("/create",create)
colorRouter.get("/", getData)
colorRouter.put("/update/:id",update);
colorRouter.patch("/status/:id", statusUpdate)
colorRouter.delete("/delete/:id", deleteById)




module.exports = colorRouter;