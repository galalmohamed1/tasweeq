// routes/product.routes.js
const express = require("express");
const router = express.Router();

const {
    createProduct,
    getProducts,
    getProductBySlug,
    updateProduct,
    deleteProduct
} = require("../controllers/product.controller");

// غيّر المسار والأسماء دي حسب الـ middleware اللي عندك
const { protect} = require("../middlewares/auth");
const { isAdmin }= require("../middlewares/isAdmin");
const { uploadProductMedia } = require("../middlewares/upload");

// Public
router.get("/", getProducts);
router.get("/:slug", getProductBySlug);

// Admin only
router.post("/", protect, isAdmin, uploadProductMedia, createProduct);
router.put("/:id", protect, isAdmin, uploadProductMedia, updateProduct);
router.delete("/:id", protect, isAdmin, deleteProduct);

module.exports = router;