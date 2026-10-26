const asyncHandler = require("../middlewares/asyncHandler");

const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

// نفس الـ populate في كل الدوال، و match بيشيل المنتجات المحذوفة أو المخفية
const populateProducts = {
    path: "products",
    match: { isDeleted: false, isActive: true },
    select: "title slug description price discountPrice images category subCategory averageRating"
};

// ==================== Get Wishlist ====================

const getWishlist = asyncHandler(async (req, res) => {

    const wishlist = await Wishlist.findOne({
        user: req.user._id
    }).populate(populateProducts);

    // User has no wishlist yet
    if (!wishlist) {
        return res.status(200).json({
            success: true,
            count: 0,
            data: []
        });
    }

    return res.status(200).json({
        success: true,
        count: wishlist.products.length,
        data: wishlist.products
    });
});


// ==================== Add To Wishlist ====================

const addToWishlist = asyncHandler(async (req, res) => {

    const { productId } = req.body;

    if (!productId) {
        return res.status(400).json({
            success: false,
            message: "Product ID is required"
        });
    }

    // Check Product
    const product = await Product.findOne({
        _id: productId,
        isDeleted: false,
        isActive: true
    });

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found"
        });
    }

    // Find User Wishlist
    let wishlist = await Wishlist.findOne({
        user: req.user._id
    });

    // Create Wishlist if doesn't exist
    if (!wishlist) {

        wishlist = await Wishlist.create({
            user: req.user._id,
            products: [productId]
        });

        await wishlist.populate(populateProducts);

        return res.status(201).json({
            success: true,
            message: "Product added to wishlist",
            count: wishlist.products.length,
            data: wishlist.products
        });
    }

    // Check if product already exists
    const productExists = wishlist.products.some(
        id => id.toString() === productId.toString()
    );

    if (productExists) {
        return res.status(400).json({
            success: false,
            message: "Product already exists in wishlist"
        });
    }

    // Add Product
    wishlist.products.push(productId);

    await wishlist.save();

    await wishlist.populate(populateProducts);

    return res.status(200).json({
        success: true,
        message: "Product added to wishlist",
        count: wishlist.products.length,
        data: wishlist.products
    });
});


// ==================== Remove From Wishlist ====================

const removeFromWishlist = asyncHandler(async (req, res) => {

    const { productId } = req.params;

    if (!productId) {
        return res.status(400).json({
            success: false,
            message: "Product ID is required"
        });
    }

    const wishlist = await Wishlist.findOne({
        user: req.user._id
    });

    if (!wishlist) {
        return res.status(404).json({
            success: false,
            message: "Wishlist not found"
        });
    }

    const productExists = wishlist.products.some(
        id => id.toString() === productId.toString()
    );

    if (!productExists) {
        return res.status(404).json({
            success: false,
            message: "Product not found in wishlist"
        });
    }

    wishlist.products = wishlist.products.filter(
        id => id.toString() !== productId.toString()
    );

    await wishlist.save();

    await wishlist.populate(populateProducts);

    return res.status(200).json({
        success: true,
        message: "Product removed from wishlist",
        count: wishlist.products.length,
        data: wishlist.products
    });
});


module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist
};