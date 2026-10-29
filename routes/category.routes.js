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
const { authorizeRoles } = require("../middlewares/authorizeRoles");
const { upload } = require("../middlewares/upload");

// عام
router.get("/", getAllCategories);
router.get("/:slug", getCategoryBySlug);

// أدمن بس
router.post("/", protect, authorizeRoles("admin", "salesManager"), upload.single("image"), createCategory);
router.put("/:id", protect, authorizeRoles("admin", "salesManager"), upload.single("image"), updateCategory);
router.delete("/:id", protect, authorizeRoles("admin", "salesManager"), deleteCategory);

module.exports = router;