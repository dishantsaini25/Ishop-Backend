const orderRouter = require("express").Router();
const userVerify = require("../middleware/userVerify");
const {
    place,
    orderSuccess,
    getMyOrders,     
    getOrderById    
} = require("../controllers/order.controller");

// Place order (with notification)
orderRouter.post("/place", userVerify, place);

// Order success webhook/callback
orderRouter.post("/success", orderSuccess);

// Get user's all orders
orderRouter.get("/my-orders", userVerify, getMyOrders);      

// Get single order by ID
orderRouter.get("/my-orders/:order_id", userVerify, getOrderById);  

module.exports = orderRouter;