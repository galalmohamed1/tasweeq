const express = require("express");
const router = express.Router();

const {
    createDetailsSubCategory,
    getAllDetailsSubCategories,
    getDetailsSubCategoryById,
    getDetailsBySubCategory,
    updateDetailsSubCategory,
    deleteDetailsSubCategory
} = require("../controllers/detailsSubCategory.controller");

const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/isAdmin");

// عام
router.get("/", getAllDetailsSubCategories);
router.get("/subcategory/:subCategoryId", getDetailsBySubCategory); // لازم قبل /:id
router.get("/:id", getDetailsSubCategoryById);

// أدمن بس
router.post("/", protect, isAdmin, createDetailsSubCategory);
router.put("/:id", protect, isAdmin, updateDetailsSubCategory);
router.delete("/:id", protect, isAdmin, deleteDetailsSubCategory);

module.exports = router;