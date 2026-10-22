const asyncHandler = require("../middlewares/asyncHandler");

const Coupon = require("../models/Coupon");

// ======== create coupon ==========

const createCoupon = asyncHandler(async(req,res)=>{
    const {code,discountPercentage, expireDate} = req.body;

    if(!code || discountPercentage === undefined || !expireDate){
        return res.status(400).json({
            success: false,
            message:"Cose, discountPercentage and expireDate are required"
        });
    }

    const discount = Number(discountPercentage);
    const expire = new Date(expireDate);

    if (isNaN(discount) || discount < 1 || discount > 100) {
        return res.status(400).json({
            success: false,
            message: "Discount percentage must be between 1 and 100"
        });
    }

    if (isNaN(expire.getTime())) {
        return res.status(400).json({
            success: false,
            message: "Invalid expire date"
        });
    }

     if (expire <= new Date()) {
        return res.status(400).json({
            success: false,
            message: "Expire date must be in the future"
        });
    }
    const couponCode = code.trim().toUpperCase();

    const existingCoupon = await Coupon.findOne({
        code: couponCode
    });

    if (existingCoupon) {
        return res.status(400).json({
            success: false,
            message: "Coupon code already exists"
        });
    }

    const coupon = await Coupon.create({
        code:couponCode,
        discountPercentage:discount,
        expireDate: expire
    });

    return res.status(201).json({
        success: true,
        message:"Coupon created succfully",
        data: coupon
    });
});

// ================= Get All Coupons ===========

const getAllCoupons = asyncHandler(async(req,res)=>{
    const coupons = await Coupon.find({
        isDeleted: false,
    }).sort({
        createAt: -1,
    });

    return res.status(20).json({
        success: true,
        count: coupons.length,
        data: coupons,
    });
});

//================== Get Coupon By ID ===============

const getCouponById = asyncHandler(async (req,res)=>{
    const { id } = req.params;
    const coupon = await Coupon.fondOne({
        _id:id,
        isDeleted:false,
    });

    if(!coupon){
        return res.status(404).json({
            success: false,
            message:"Coupon Not Found"
        });
    }

    return res.status(200).json({
        success: true,
        data: coupon
    });
});

// =============== Apply Coupon ==================

const applyCoupon = asyncHandler( async (req,res)=>{
    const {code, subtotal} = req.body;

    if (!code || subtotal === undefined) {
        return res.status(400).json({
            success: false,
            message: "Code and subtotal are required"
        });
    }

    const cartSubtotal = Number(subtotal);
    if (isNaN(cartSubtotal) || cartSubtotal < 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid subtotal"
        });
    }

    const couponCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({
        code: couponCode,
        isActive: true,
        isDeleted: false,
        expireDate: {
            $gt: new Date()
        }
    });
    if (!coupon) {
        return res.status(404).json({
            success: false,
            message: "Invalid, inactive or expired coupon"
        });
    }

    const discountAmount = (cartSubtotal * coupon.discountPercentage) /100;
    
    const totalAfterDiscount = cartSubtotal - discountAmount;

    return res.status(200).json({
        success: true,
        message: "Coupon applied successfully",
        data: {
            coupon: {
                id: coupon._id,
                code: coupon.code,
                discountPercentage: coupon.discountPercentage
            },
            subtotal: cartSubtotal,
            discountAmount,
            totalAfterDiscount
        }
    });
});

// ==================== Update Coupon ====================

const updateCoupon = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const {
        code,
        discountPercentage,
        expireDate,
        isActive
    } = req.body;

    const coupon = await Coupon.findOne({
        _id: id,
        isDeleted: false
    });

    if (!coupon) {
        return res.status(404).json({
            success: false,
            message: "Coupon not found"
        });
    }

    // Update Code

    if (code !== undefined) {

        const newCode = code.trim().toUpperCase();

        const existingCoupon = await Coupon.findOne({
            code: newCode,
            _id: { $ne: id },
            isDeleted: false
        });

        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists"
            });
        }

        coupon.code = newCode;
    }


    // Update Discount

    if (discountPercentage !== undefined) {

        const discount = Number(discountPercentage);

        if (isNaN(discount) || discount < 1 || discount > 100) {
            return res.status(400).json({
                success: false,
                message: "Discount percentage must be between 1 and 100"
            });
        }

        coupon.discountPercentage = discount;
    }


    // Update Expire Date

    if (expireDate !== undefined) {

        const expiry = new Date(expireDate);

        if (isNaN(expiry.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid expire date"
            });
        }

        if (expiry <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Expire date must be in the future"
            });
        }

        coupon.expireDate = expiry;
    }


    // Update Active Status

    if (isActive !== undefined) {

        coupon.isActive =
            isActive === "true" || isActive === true;
    }


    await coupon.save();

    return res.status(200).json({
        success: true,
        message: "Coupon updated successfully",
        data: coupon
    });
});


// ==================== Delete Coupon ====================

const deleteCoupon = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const coupon = await Coupon.findOne({
        _id: id,
        isDeleted: false
    });

    if (!coupon) {
        return res.status(404).json({
            success: false,
            message: "Coupon not found"
        });
    }

    // Soft Delete

    coupon.isDeleted = true;

    await coupon.save();

    return res.status(200).json({
        success: true,
        message: "Coupon deleted successfully",
        data: null
    });
});


module.exports = {
    createCoupon,
    getAllCoupons,
    getCouponById,
    applyCoupon,
    updateCoupon,
    deleteCoupon
};