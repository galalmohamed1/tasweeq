const express = require("express");
const router = express.Router();

const {
    createSubCategory,
    getAllSubCategories,
    getSubCategoryById,
    getSubCategoriesByCategory,
    updateSubCategory,
    deleteSubCategory
} = require("../controllers/subCategory.controller");

const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/isAdmin");

// عام
router.get("/", getAllSubCategories);
router.get("/category/:categoryId", getSubCategoriesByCategory); // لازم قبل /:id
router.get("/:id", getSubCategoryById);

// أدمن بس
router.post("/", protect, isAdmin, createSubCategory);
router.put("/:id", protect, isAdmin, updateSubCategory);
router.delete("/:id", protect, isAdmin, deleteSubCategory);

module.exports = router;