const express = require("express");
const router = express.Router();

const {
  createDetailsSubCategory,
  getAllDetailsSubCategories,
  getDetailsSubCategoryById,
  getDetailsBySubCategory,
  updateDetailsSubCategory,
  deleteDetailsSubCategory,
} = require("../controllers/detailsSubCategory.controller");

const { protect } = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

// عام
router.get("/", getAllDetailsSubCategories);
router.get("/subcategory/:subCategoryId", getDetailsBySubCategory); // لازم قبل /:id
router.get("/:id", getDetailsSubCategoryById);

// أدمن بس
router.post(
  "/",
  protect,
  authorizeRoles("admin", "salesManager"),
  createDetailsSubCategory,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "salesManager"),
  updateDetailsSubCategory,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "salesManager"),
  deleteDetailsSubCategory,
);

module.exports = router;
