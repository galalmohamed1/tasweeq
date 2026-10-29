const express = require("express");
const router = express.Router();

const {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  getSubCategoriesByCategory,
  updateSubCategory,
  deleteSubCategory,
} = require("../controllers/subCategory.controller");

const { protect } = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

// عام
router.get("/", getAllSubCategories);
router.get("/category/:categoryId", getSubCategoriesByCategory); // لازم قبل /:id
router.get("/:id", getSubCategoryById);

// أدمن بس
router.post(
  "/",
  protect,
  authorizeRoles("admin", "salesManager"),
  createSubCategory,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "salesManager"),
  updateSubCategory,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "salesManager"),
  deleteSubCategory,
);

module.exports = router;
