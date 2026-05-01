const userRouter = require("express").Router();
const userVerify = require("../middleware/userVerify");

const {
    register,
    login,
    verifyOtp,
    resetOtp,
    me,
    logout,
    addAddress,
    updateAddress,
    deleteAddress,
    getUserById,
    updateProfile,
    changePassword,
    getCurrentUser,
    sendPasswordResetOtp,
    verifyResetOtpAndChangePassword
} = require("../controllers/user.controller");

// ==================== PUBLIC ROUTES ====================
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/otp-verify", verifyOtp);
userRouter.post("/verify-otp", verifyOtp);
userRouter.post("/reset-otp", resetOtp);
userRouter.get("/me/:user_id", getUserById);

// ✅ Password Reset Routes
userRouter.post("/forgot-password", sendPasswordResetOtp);
userRouter.post("/reset-password", verifyResetOtpAndChangePassword);

// ==================== PROTECTED ROUTES ====================
userRouter.get("/me", userVerify, getCurrentUser);
userRouter.get("/logout", userVerify, logout);
userRouter.post("/logout", userVerify, logout);
userRouter.put("/update", userVerify, updateProfile);
userRouter.put("/change-password", userVerify, changePassword);

// Address routes
userRouter.post("/address/:id", userVerify, addAddress);
userRouter.put("/address/:user_id/:index", userVerify, updateAddress);
userRouter.delete("/address/:user_id/:index", userVerify, deleteAddress);

module.exports = userRouter;