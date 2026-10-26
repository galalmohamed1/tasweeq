const mongoose = require("mongoose");

const asyncHandler = require("../middlewares/asyncHandler");

const Cart = require("../models/Cart");

const Product = require("../models/Product");


const PRODUCT_SELECT = "title slug price discountPrice stock images category subCategory isActive isDeleted";

// السعر الحالي للمنتج (بعد الخصم لو موجود)
const getProductPrice = (product) =>
    product.discountPrice > 0
        ? product.discountPrice
        : product.price;

// الحقول الاختيارية بتتحول لـ null عشان المقارنة تبقى ثابتة (undefined !== null)
const normalize = (value) => value || null;

// نفس المنتج + نفس المقاس + نفس اللون
const isSameItem = (item, productId, size, color) =>
    item.product.toString() === productId.toString() &&
    normalize(item.size) === normalize(size) &&
    normalize(item.color) === normalize(color);

const matchesItemForRemoval = (item, productId, size, color) =>
    item.product.toString() === productId.toString() &&
    (!size || normalize(item.size) === normalize(size)) &&
    (!color || normalize(item.color) === normalize(color));

const calculateTotal = (cart) =>
    cart.items.reduce((total, item) => total + item.subTotal, 0);


// ==================== Get Cart ====================

const getCart = asyncHandler(async (req, res) => {

    const cart = await Cart.findOne({
        user: req.user._id
    }).populate({
        path: "items.product",
        select: PRODUCT_SELECT
    });

    if (!cart) {
        return res.status(200).json({
            success: true,
            count: 0,
            data: {
                items: [],
                totalPrice: 0
            }
        });
    }

    return res.status(200).json({
        success: true,
        count: cart.items.length,
        data: cart
    });
});


// ==================== Add To Cart ====================

const addToCart = asyncHandler(async (req, res) => {

    const { productId, quantity, size, color } = req.body;

    if (!productId || !mongoose.isValidObjectId(productId)) {
        return res.status(400).json({
            success: false,
            message: "Valid Product ID is required"
        });
    }

    const itemQuantity = quantity !== undefined
        ? Number(quantity)
        : 1;

    if (!Number.isInteger(itemQuantity) || itemQuantity < 1) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be a positive integer"
        });
    }

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

    // لو المنتج له مقاسات أو ألوان، لازم العميل يختار واحد منهم
    if (product.sizes.length > 0 && !product.sizes.includes(size)) {
        return res.status(400).json({
            success: false,
            message: "Please choose a valid size"
        });
    }

    if (product.colors.length > 0 && !product.colors.includes(color)) {
        return res.status(400).json({
            success: false,
            message: "Please choose a valid color"
        });
    }

    const productPrice = getProductPrice(product);

    let cart = await Cart.findOne({
        user: req.user._id
    });

    // Create cart if not exists
    if (!cart) {
        cart = new Cart({
            user: req.user._id,
            items: []
        });
    }

    // Check same product + same size + same color
    const existingItem = cart.items.find(
        item => isSameItem(item, productId, size, color)
    );

    const newQuantity = (existingItem ? existingItem.quantity : 0) + itemQuantity;

    if (newQuantity > product.stock) {
        return res.status(400).json({
            success: false,
            message: `Only ${product.stock} item(s) left in stock`
        });
    }

    if (existingItem) {

        existingItem.quantity = newQuantity;

        existingItem.price = productPrice;

        existingItem.subTotal = newQuantity * productPrice;

    } else {

        cart.items.push({
            product: productId,
            quantity: itemQuantity,
            price: productPrice,
            subTotal: productPrice * itemQuantity,
            size: normalize(size),
            color: normalize(color)
        });
    }

    cart.totalPrice = calculateTotal(cart);

    await cart.save();

    await cart.populate({
        path: "items.product",
        select: PRODUCT_SELECT
    });

    return res.status(200).json({
        success: true,
        message: "Product added to cart",
        data: cart
    });
});


// ==================== Update Cart Item Quantity ====================

const updateCartItemQuantity = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const { productId, quantity, size, color } = req.body;

    if (!id || !productId || quantity === undefined) {
        return res.status(400).json({
            success: false,
            message: "Cart ID, Product ID and quantity are required"
        });
    }

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(productId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid Cart ID or Product ID"
        });
    }

    const newQuantity = Number(quantity);

    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be a positive integer"
        });
    }

    const cart = await Cart.findOne({
        _id: id,
        user: req.user._id
    });

    if (!cart) {
        return res.status(404).json({
            success: false,
            message: "Cart not found"
        });
    }

    const item = cart.items.find(
        item => isSameItem(item, productId, size, color)
    );

    if (!item) {
        return res.status(404).json({
            success: false,
            message: "Product not found in cart"
        });
    }

    const product = await Product.findOne({
        _id: productId,
        isDeleted: false,
        isActive: true
    });

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found or inactive"
        });
    }

    if (newQuantity > product.stock) {
        return res.status(400).json({
            success: false,
            message: `Only ${product.stock} item(s) left in stock`
        });
    }

    const productPrice = getProductPrice(product);

    item.quantity = newQuantity;

    item.price = productPrice;

    item.subTotal = newQuantity * productPrice;

    cart.totalPrice = calculateTotal(cart);

    await cart.save();

    await cart.populate({
        path: "items.product",
        select: PRODUCT_SELECT
    });

    return res.status(200).json({
        success: true,
        message: "Cart quantity updated successfully",
        data: cart
    });
});


// ==================== Remove From Cart ====================

const removeFromCart = asyncHandler(async (req, res) => {

    const { productId } = req.params;

    const { size, color } = req.query;

    if (!productId || !mongoose.isValidObjectId(productId)) {
        return res.status(400).json({
            success: false,
            message: "Valid Product ID is required"
        });
    }

    const cart = await Cart.findOne({
        user: req.user._id
    });

    if (!cart) {
        return res.status(404).json({
            success: false,
            message: "Cart not found"
        });
    }

    const itemExists = cart.items.some(
        item => matchesItemForRemoval(item, productId, size, color)
    );

    if (!itemExists) {
        return res.status(404).json({
            success: false,
            message: "Product not found in cart"
        });
    }

    cart.items = cart.items.filter(
        item => !matchesItemForRemoval(item, productId, size, color)
    );

    cart.totalPrice = calculateTotal(cart);

    await cart.save();

    await cart.populate({
        path: "items.product",
        select: PRODUCT_SELECT
    });

    return res.status(200).json({
        success: true,
        message: "Product removed from cart",
        data: cart
    });
});


// ==================== Clear Cart ====================

const clearCart = asyncHandler(async (req, res) => {

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid Cart ID"
        });
    }

    const cart = await Cart.findOne({
        _id: id,
        user: req.user._id
    });

    if (!cart) {
        return res.status(404).json({
            success: false,
            message: "Cart not found"
        });
    }

    cart.items = [];

    cart.totalPrice = 0;

    await cart.save();

    return res.status(200).json({
        success: true,
        message: "Cart cleared successfully",
        data: {
            items: [],
            totalPrice: 0
        }
    });
});


module.exports = {
    getCart,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart
};