const crypto = require('crypto');

const User = require('../models/user.model');
const asyncHandler = require('../middlewares/asyncHandler');

const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');


const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if(!name || !email || !password) {
        res.status(400).json({
            success: false,
            message: 'Please provide name, email, and password are required'
        });
    }

    const existingUser = await User.findOne({
        $or: [{email}, ...(phoneNumber ? [{phoneNumber}] : [])]
    });

    if(existingUser) {
        res.status(400).json({
            success: false,
            message: 'User with this email or phone number already exists'
        });
    }

    const hashedotp =crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.create({
        name,
        email,
        password,
        phoneNumber,
        verificationOTP: hashedotp,
        verficationOTPExpire: Date.now() + 10 * 60 * 1000 // OTP expires in 10 minutes
    });

    await sendEmail({
        email:user.email,
        subject:"Verify Your Email",
        html:`<h2>Welcome ${user.name}</h2>

            <p>
                Your email verification code is:
            </p>

            <h1 style="letter-spacing: 5px;">
                ${otp}
            </h1>

            <p>
                This OTP will expire in 10 minutes.
            </p>
        `
    });
    return res.status(201).json({
        success: true,
        message: "Registration successful. OTP sent to your email."
    });
});

const login = asyncHandler(async (req,res)=> {
    const {email,password}= req.body;

    if(!email || !password){
        return res.status(400).json({
            success: false,
            message:"Email and password are required"
        });
    }

    const user = await User.findOne({
        email,
        isDeleted: false
    }).select("+password");

    if(!user){
        return res.status(401).json({
            success:false,
            message:"Invalid Email or Password"
        });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if(!isPasswordCorrect){
        return res.status(401).json({
            success:false,
            message:"Invalid Email or Password"
        });
    }

    if (!user.isVerified) {
        return res.status(403).json({
            success: false,
            message: "Please verify your email first"
        });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role
            }
        }
    });

});

const forgetPassword = asyncHandler(async (req,res) => {
    const {email} = req.body;

    if(!email){
        return res.status(400).json({
            success:false,
            message:"Email is Required"
        });
    }

    const user = await User.findOne({
        email,
        isDeleted:false,
    });

    if(!user){
        return res.status(404).json({
            success:false,
            message:"No User Found With This Email"
        });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl =
        `http://localhost:5000/api/auth/resetPassword/${resetToken}`;

    await sendEmail({
        email: user.email,
        subject: "Reset Your Password",
        html: `
            <h2>Password Reset</h2>

            <p>
                You requested to reset your password.
            </p>

            <a href="${resetUrl}">
                Reset Password
            </a>

            <p>
                This link will expire in 10 minutes.
            </p>
        `
    });
     return res.status(200).json({
        success: true,
        message: "Password reset link sent to your email"
    });
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({
            success: false,
            message: "Password is required"
        });
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
        isDeleted: false
    });

    if (!user) {
        return res.status(400).json({
            success: false,
            message: "Invalid or expired reset token"
        });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
        success: true,
        message: "Password reset successfully"
    });
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({
            success: false,
            message: "Email and OTP are required"
        });
    }

    if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
            success: false,
            message: "OTP must be 6 digits"
        });
    }

    const hashedOTP = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const user = await User.findOne({
        email,
        verificationOTP: hashedOTP,
        verificationOTPExpires: {
            $gt: Date.now()
        },
        isDeleted: false
    }).select("+verificationOTP");

    if (!user) {
        return res.status(400).json({
            success: false,
            message: "Invalid or expired OTP"
        });
    }

    user.isVerified = true;

    user.verificationOTP = undefined;
    user.verificationOTPExpires = undefined;

    await user.save();

    return res.status(200).json({
        success: true,
        message: "Email verified successfully",
        data: null
    });
});

module.exports = {
    register,
    login,
    forgetPassword,
    resetPassword,
    verifyEmail
}