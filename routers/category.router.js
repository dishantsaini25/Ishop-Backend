const categoryRouter = require("express").Router();
const { create, getData, update, statusUpdate, deleteById } = require("../controllers/category.controller");

categoryRouter.post("/create", create);
categoryRouter.get("/", getData);
categoryRouter.put("/update/:id", update);
categoryRouter.patch("/status/:id", statusUpdate);
categoryRouter.delete("/delete/:id", deleteById);

module.exports = categoryRouter;
