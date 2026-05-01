const CartModel = require("../models/cart.model");
const { serverError_Response, successResponse } = require("../utils/response")

const cartSync = async (req, res) => {
    try {
        const { cart, user_id } = req.body;
        if (!user_id) {
            return serverError_Response(res, "User ID is required");
        }

        if (cart && cart.length > 0) {
            for (const item of cart) {

                let cartItem = await CartModel.findOne({
                    userId: user_id,
                    productId: item.id
                });

                if (cartItem) {
              
                    cartItem.qty = item.qty; 
                    await cartItem.save();
                } else {
                    cartItem = await CartModel.create({
                        userId: user_id,
                        productId: item.id,
                        qty: item.qty
                    });
                }
            }
        } else {
            console.log("No cart items to sync");
        }

        const updatedCart = await CartModel.find({ userId: user_id })
            .populate("productId", "_id name slug original_price final_price thumbnail discount_price stock");


        return successResponse(res, "Cart Synced", { cart: updatedCart });

    } catch (error) {
        console.log("Cart Sync Error:", error);
        return serverError_Response(res, error.message);
    }
}
const addTocart = async (req, res) => {
    try {
        const { productId, user_id, flag } = req.body;

        if (!user_id || !productId) {
            return serverError_Response(res, "User ID and Product ID are required");
        }

        let cartItem = await CartModel.findOne({
            userId: user_id,
            productId: productId
        });

        if (cartItem) {
            if (flag === 1) {
                cartItem.qty++;
            } else {
                cartItem.qty--;
                if (cartItem.qty <= 0) {
                    await CartModel.deleteOne({ _id: cartItem._id });
                    return successResponse(res, "Item removed from cart");
                }
            }
            await cartItem.save();
        } else {
            if (flag === 1) {
                cartItem = await CartModel.create({
                    userId: user_id,
                    productId: productId,
                    qty: 1
                });
            }
        }


        const cartCount = await CartModel.countDocuments({ userId: user_id });

        return successResponse(res, "Cart updated", { count: cartCount });

    } catch (error) {
        console.log("Add to Cart Error:", error);
        return serverError_Response(res, error.message);
    }
}
const getCart = async (req, res) => {
    try {
        const { user_id } = req.params;

        const cart = await CartModel.find({ userId: user_id })
            .populate("productId", "_id name final_price original_price thumbnail discount_price stock");

        return successResponse(res, "Cart fetched", { cart });

    } catch (error) {
        console.log("Get Cart Error:", error);
        return serverError_Response(res, error.message);
    }
};


module.exports = {
    cartSync,
    addTocart,
    getCart
}