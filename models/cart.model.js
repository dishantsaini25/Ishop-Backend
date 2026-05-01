const mongoose = require("mongoose");
const CartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "products",
            required: true
        },
        qty: {
            type: Number,
            default: 1,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const CartModel = mongoose.model("Cart", CartSchema);

module.exports = CartModel;