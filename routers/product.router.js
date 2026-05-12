const productRouter = require("express").Router();
const {
  create,
  getData,
  getDealOfDay,
  updateDealOfDay,
  add_images,
  statusUpdate,
  deleteById,
  deleteOtherImages,
  update
} = require("../controllers/product.controller");

const fileupload = require("express-fileupload")

productRouter.post("/create", fileupload({ createParentPath: true }), create)
productRouter.get("/", getData)
productRouter.get("/deal-of-day", getDealOfDay)
productRouter.put("/deal-of-day/:id", updateDealOfDay)
productRouter.post("/images/:id", fileupload({ createParentPath: true }), add_images)
productRouter.patch("/status/:id", statusUpdate)
productRouter.delete("/delete/:id", deleteById)
productRouter.delete("/other-images/:productId", deleteOtherImages);
productRouter.put("/update/:id", fileupload({ createParentPath: true }), update);

module.exports = productRouter;