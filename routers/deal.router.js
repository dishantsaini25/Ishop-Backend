const dealRouter = require("express").Router();
const { getDeals, setDeal, getAllDeals, removeDeal } = require("../controllers/deal.controller");
const { adminAuth } = require("../middleware/adminAuth");

// Public - homepage
dealRouter.get("/", getDeals);

// Admin protected
dealRouter.get("/admin/all", adminAuth, getAllDeals);
dealRouter.post("/admin/:product_id", adminAuth, setDeal);
dealRouter.delete("/admin/:product_id", adminAuth, removeDeal);

module.exports = dealRouter;
