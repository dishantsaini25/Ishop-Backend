const mongoose = require("mongoose");

const ShippingAddressSchema = new mongoose.Schema(
    {
        addressLine1: { type: String, required: true },
        addressLine2: { type: String, default: "" },
        city: { type: String, required: true },
        contact: { type: String, default: null },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            minLength: 4
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        shipping_address: {
            type: [ShippingAddressSchema],
            default: [],
        },
        otp: {
            type: String,
            default: null
        },
        otpExpiry: {
            type: Date,
            default: null
        },
        // ✅ For password reset
        resetPasswordOtp: {
            type: String,
            default: null
        },
        resetPasswordOtpExpiry: {
            type: Date,
            default: null
        },
        isverified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true
    }
);

const UserModel = mongoose.model("users", userSchema);
module.exports = UserModel;