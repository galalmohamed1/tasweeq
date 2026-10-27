// routes/category.routes.js
const express = require("express");
const router = express.Router();

const {
    createCategory,
    getAllCategories,
    getCategoryBySlug,
    updateCategory,
    deleteCategory
} = require("../controllers/category.controller");

const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/isAdmin");
const { upload } = require("../middlewares/upload");

// عام
router.get("/", getAllCategories);
router.get("/:slug", getCategoryBySlug);

// أدمن بس
router.post("/", protect, isAdmin, upload.single("uploads"), createCategory);
router.put("/:id", protect, isAdmin, upload.single("uploads"), updateCategory);
router.delete("/:id", protect, isAdmin, deleteCategory);

module.exports = router;