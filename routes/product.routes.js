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
const {authorizeRoles}= require("../middlewares/authorizeRoles");
const upload = require("../middlewares/upload");
const productMedia = upload.fields([{ name: "images", maxCount: 10 }]);

// Public
router.get("/", getProducts);
router.get("/:slug", getProductBySlug);

// Admin only
router.post("/", protect, authorizeRoles("admin", "salesManager"), productMedia, createProduct);
router.put("/:id", protect, authorizeRoles("admin", "salesManager"), productMedia, updateProduct);
router.delete("/:id", protect, authorizeRoles("admin", "salesManager"), deleteProduct);

module.exports = router;