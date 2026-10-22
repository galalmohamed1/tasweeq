const User = require("../models/user.model");
const asyncHandler = require("../middlewares/asyncHandler");

// =========================
// Get Current User Profile
// =========================
const getProfile = asyncHandler(async (req,res)=>{

    const user = await User.findById(req.user._id).select("-password");
    if(!user || user.isDeleted){
        return res.status(404).json({
            success: false,
            message:"User Not Found"
        });
    }
    return res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        data: user
    });
});

// =========================
// Update Current User Profile
// =========================
const updateProfile = asyncHandler(async (req, res) => {

    const { name, phoneNumber } = req.body;

    const user = await User.findById(req.user._id);

    if (!user || user.isDeleted) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    if (name !== undefined) {
        user.name = name;
    }

    if (phoneNumber !== undefined) {

        const existingUser = await User.findOne({
            phoneNumber,
            _id: { $ne: user._id },
            isDeleted: false
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Phone number already exists"
            });
        }

        user.phoneNumber = phoneNumber;
    }

    await user.save();

    return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
            id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role
        }
    });
});


// =========================
// Update Password
// =========================
const updatePassword = asyncHandler(async (req, res) => {

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: "Current password and new password are required"
        });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user || user.isDeleted) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
        return res.status(401).json({
            success: false,
            message: "Current password is incorrect"
        });
    }

    user.password = newPassword;

    await user.save();

    return res.status(200).json({
        success: true,
        message: "Password updated successfully"
    });
});


// =========================
// Get All Users - Admin
// =========================
const getAllUsers = asyncHandler(async (req, res) => {

    const users = await User.find({
        isDeleted: false
    }).select("-password");

    return res.status(200).json({
        success: true,
        count: users.length,
        data: users
    });
});


// =========================
// Get User By ID - Admin
// =========================
const getUserById = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const user = await User.findOne({
        _id: id,
        isDeleted: false
    }).select("-password");

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.status(200).json({
        success: true,
        data: user
    });
});


// =========================
// Delete User - Admin
// =========================
const deleteUser = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const user = await User.findOne({
        _id: id,
        isDeleted: false
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    user.isDeleted = true;

    await user.save();

    return res.status(200).json({
        success: true,
        message: "User deleted successfully"
    });
});


module.exports = {
    getProfile,
    updateProfile,
    updatePassword,
    getAllUsers,
    getUserById,
    deleteUser
};