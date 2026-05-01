const cartRouter = require("express").Router();
const { cartSync, addTocart,getCart } = require("../controllers/cart.controller");

cartRouter.post("/cart-sync", cartSync);
cartRouter.post("/add-to-cart", addTocart);
cartRouter.get("/get/:user_id", getCart);

module.exports = cartRouter;