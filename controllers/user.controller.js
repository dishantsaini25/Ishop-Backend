const { allFieldsResponse, serverError_Response, successResponse, notFound_Response, updateResponse, deleteResponse, otpVerificationResponse, createdResponse, alreadyExist_Response } = require("../utils/response");
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.SECRET_KEY);
var jwt = require('jsonwebtoken');
const sendOtpMail = require("../utils/sendOtpMail");
const UserModel = require("../models/user.model");

// ==================== AUTH CONTROLLERS ====================

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        console.log('=== REGISTER REQUEST ===');
        console.log('Email:', email);
        console.log('Origin:', req.headers.origin);
        
        if (!name || !email || !password) return allFieldsResponse(res);
        
        const user = await UserModel.findOne({ email });
        if (user && user.isverified === true) return alreadyExist_Response(res);
        
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otp_expire = Date.now() + 10 * 60 * 1000;

        let newUser;
        if (user && user.isverified === false) {
            user.name = name;
            user.password = cryptr.encrypt(password);
            user.otp = otp;
            user.otpExpiry = otp_expire;
            newUser = await user.save();
        } else {
            newUser = await UserModel.create({
                name,
                email,
                password: cryptr.encrypt(password),
                otp,
                otpExpiry: otp_expire
            });
        }
        
        console.log('Sending OTP to:', email);
        
        // Send email async - don't block the response
        // User will get OTP shortly, can resend if needed
        sendOtpMail(email, otp, "Your OTP Code - Verify Your Email")
            .then(mailResponse => {
                console.log('Mail response for', email, ':', mailResponse);
            })
            .catch(err => {
                console.error('Mail error for', email, ':', err.message);
            });

        console.log('✓ Registration successful for:', email);
        return createdResponse(res, "Registration successful! OTP sent to your email.", newUser);
    } catch (error) {
        console.error('Registration error:', error);
        return serverError_Response(res);
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('=== LOGIN REQUEST ===');
        console.log('Email:', email);
        console.log('Origin:', req.headers.origin);
        console.log('NODE_ENV:', process.env.NODE_ENV);
        
        if (!email || !password) return allFieldsResponse(res);
        
        const user = await UserModel.findOne({ email });
        if (!user) return notFound_Response(res, "User not found");
        if (user.isverified === false) return notFound_Response(res, "Please verify your email to login");
        
        const decryptedPassword = cryptr.decrypt(user.password);
        if (decryptedPassword !== password) return notFound_Response(res, "Invalid credentials");
        
        const token = jwt.sign({
            id: user._id,
            name: user.name,
            email: user.email
        }, process.env.SECRET_KEY, { expiresIn: '7d' });
        
        const isProduction = process.env.NODE_ENV === 'production';
        
        const cookieOptions = {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: '/',
            domain: isProduction ? undefined : undefined // Let browser handle domain
        };
        
        console.log('Setting cookie with options:', cookieOptions);
        
        res.cookie("user_token", token, cookieOptions);
        
        console.log('✓ Login successful for:', email);
        
        return successResponse(res, "Login successful", { 
            name: user.name, 
            email: user.email, 
            id: user._id,
            token: token // Also send token in response for debugging
        });
    } catch (error) {
        console.error('Login error:', error);
        return serverError_Response(res);
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return allFieldsResponse(res);
        
        const user = await UserModel.findOne({ email });
        if (!user) return notFound_Response(res, "User not found");
        
        if (user.otp != otp) {
            return otpVerificationResponse(res, "Invalid OTP", false);
        }
        if (user.otpExpiry < Date.now()) return otpVerificationResponse(res, "OTP Expired", false);
        
        user.isverified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();
        
        return otpVerificationResponse(res, "OTP Verified Successfully", true);
    } catch (error) {
        console.log(error);
        return serverError_Response(res);
    }
};

const resetOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return allFieldsResponse(res);
        
        const user = await UserModel.findOne({ email });
        if (!user) return notFound_Response(res, "User not found");
        
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otp_expire = Date.now() + 10 * 60 * 1000;
        
        user.otp = otp;
        user.otpExpiry = otp_expire;
        await user.save();
        
        // Send async - don't block
        sendOtpMail(email, otp, "Your OTP Code - Verify Your Email")
            .then(r => console.log('Resend OTP mail:', r))
            .catch(e => console.error('Resend OTP mail error:', e.message));
        
        return successResponse(res, "OTP sent successfully");
    } catch (error) {
        console.log(error);
        return serverError_Response(res);
    }
};

const me = async (req, res) => {
    try {
        const user = req.user;
        return successResponse(res, "User details fetched successfully", user);
    } catch (error) {
        return serverError_Response(res);
    }
};

// ==================== PASSWORD RESET WITH OTP ====================

const sendPasswordResetOtp = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }
        
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email"
            });
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otp_expire = Date.now() + 10 * 60 * 1000;
        
        user.resetPasswordOtp = otp.toString();
        user.resetPasswordOtpExpiry = otp_expire;
        await user.save();
        
        // Send async - don't block
        sendOtpMail(email, otp, "Password Reset OTP - Ishop")
            .then(r => console.log('Reset OTP mail:', r))
            .catch(e => console.error('Reset OTP mail error:', e.message));
        
        return res.status(200).json({
            success: true,
            message: "Password reset OTP sent successfully to your email"
        });
        
    } catch (error) {
        console.error("Send password reset OTP error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const verifyResetOtpAndChangePassword = async (req, res) => {
    try {
        const { email, otp, new_password } = req.body;
        
        if (!email || !otp || !new_password) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP and new password are required"
            });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }
        
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        if (user.resetPasswordOtp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }
        
        if (user.resetPasswordOtpExpiry < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }
        
        user.password = cryptr.encrypt(new_password);
        user.resetPasswordOtp = null;
        user.resetPasswordOtpExpiry = null;
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: "Password changed successfully! You can now login with your new password."
        });
        
    } catch (error) {
        console.error("Verify OTP and change password error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// ==================== ADDRESS CONTROLLERS ====================

const addAddress = async (req, res) => {
    try {
        const id = req.params.id;
        await UserModel.findByIdAndUpdate(id, {
            $push: {
                shipping_address: {
                    ...req.body
                }
            }
        });
        return successResponse(res, "Address added successfully");
    } catch (error) {
        console.error("Add address error:", error);
        return serverError_Response(res);
    }
};

const updateAddress = async (req, res) => {
    try {
        const { user_id, index } = req.params;
        const addressData = req.body;
        
        const user = await UserModel.findById(user_id);
        if (!user) return notFound_Response(res, "User not found");
        
        if (!user.shipping_address[parseInt(index)]) {
            return notFound_Response(res, "Address not found");
        }
        
        user.shipping_address[parseInt(index)] = addressData;
        await user.save();
        
        return successResponse(res, "Address updated successfully", user.shipping_address);
    } catch (error) {
        console.error("Update address error:", error);
        return serverError_Response(res);
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { user_id, index } = req.params;
        
        const user = await UserModel.findById(user_id);
        if (!user) return notFound_Response(res, "User not found");
        
        if (!user.shipping_address[parseInt(index)]) {
            return notFound_Response(res, "Address not found");
        }
        
        user.shipping_address.splice(parseInt(index), 1);
        await user.save();
        
        return successResponse(res, "Address deleted successfully", user.shipping_address);
    } catch (error) {
        console.error("Delete address error:", error);
        return serverError_Response(res);
    }
};

const getUserById = async (req, res) => {
    try {
        const { user_id } = req.params;
        const user = await UserModel.findById(user_id).select("-password -otp -otpExpiry -resetPasswordOtp -resetPasswordOtpExpiry -__v");
        
        if (!user) return notFound_Response(res, "User not found");
        return successResponse(res, "User fetched successfully", user);
    } catch (error) {
        console.error("Get user by ID error:", error);
        return serverError_Response(res);
    }
};

const updateProfile = async (req, res) => {
    try {
        const { user_id, name } = req.body;
        
        if (!user_id || !name) {
            return allFieldsResponse(res);
        }
        
        const user = await UserModel.findByIdAndUpdate(
            user_id,
            { name },
            { new: true }
        ).select("-password -otp -otpExpiry -resetPasswordOtp -resetPasswordOtpExpiry -__v");
        
        if (!user) return notFound_Response(res, "User not found");
        return successResponse(res, "Profile updated successfully", user);
    } catch (error) {
        console.error("Update profile error:", error);
        return serverError_Response(res);
    }
};
const changePassword = async (req, res) => {
    try {
        const { user_id, current_password, new_password } = req.body;
        
        console.log("=== CHANGE PASSWORD REQUEST ===");
        console.log("User ID:", user_id);
        
        if (!user_id || !current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters"
            });
        }
        
        const user = await UserModel.findById(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        const decryptedPassword = cryptr.decrypt(user.password);
        
        console.log("Stored password (decrypted):", decryptedPassword);
        console.log("Provided password:", current_password);
        
        if (decryptedPassword !== current_password) {
            return res.status(401).json({
                success: false,
                message: `Current password is incorrect. Please enter correct password.`
            });
        }
        
        user.password = cryptr.encrypt(new_password);
        await user.save();
        
        console.log("Password changed successfully for:", user.email);
        
        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
        
    } catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.createdAt) {
            const freshUser = await UserModel.findById(user._id).select("-password -otp -otpExpiry -resetPasswordOtp -resetPasswordOtpExpiry -__v");
            return successResponse(res, "User fetched successfully", freshUser);
        }
        
        return successResponse(res, "User fetched successfully", user);
    } catch (error) {
        return serverError_Response(res);
    }
};

const logout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === 'production';
        
        res.clearCookie("user_token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: '/'
        });
        
        console.log('✓ User logged out successfully');
        return successResponse(res, "Logout successful");
    } catch (error) {
        console.error('Logout error:', error);
        return serverError_Response(res);
    }
};

module.exports = {
    register,
    login,
    verifyOtp,
    resetOtp,
    me,
    logout,
    address: addAddress,
    addAddress,
    updateAddress,
    deleteAddress,
    getUserById,
    updateProfile,
    changePassword,
    getCurrentUser,
    sendPasswordResetOtp,
    verifyResetOtpAndChangePassword
};