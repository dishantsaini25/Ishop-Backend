const router = require("express").Router();
const { create, getData, update, statusUpdate, deleteById } = require("../controllers/brand.controller");

router.post("/create", create);
router.get("/", getData);
router.put("/:id", update);
router.patch("/status/:id", statusUpdate);
router.delete("/delete/:id", deleteById);

module.exports = router;
