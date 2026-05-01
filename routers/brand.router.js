const router = require("express").Router();
const fileupload = require("express-fileupload");

const {
  create,
  getData,
  update,
  statusUpdate,
  deleteById
} = require("../controllers/brand.controller");

router.post("/create", fileupload({ createParentPath: true }), create);
router.get("/", getData);
router.put("/:id", fileupload({ createParentPath: true }), update);
router.patch("/status/:id", statusUpdate);
router.delete("/delete/:id", deleteById);

module.exports = router;
