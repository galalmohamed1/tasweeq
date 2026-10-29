const asyncHandler = require("../middlewares/asyncHandler");

const DetailsSubCategory = require("../models/detailsSubCategory");
const SubCategory = require("../models/SubCategory");

const slugify = require("../utils/slugify");

const createDetailsSubCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const subcategory = req.body.subcategory || req.body.subCategory;

  if (!name || !subcategory) {
    return res.status(400).json({
      success: false,
      message: "Name and subcategory are required",
    });
  }

  const existingSubCategory = await SubCategory.findOne({
    _id: subcategory,
    isDeleted: false,
  });

  if (!existingSubCategory) {
    return res.status(404).json({
      success: false,
      message: "SubCategory not found",
    });
  }

  const cleanName = name.trim();
  const slug = slugify(cleanName);

  const existingDetails = await DetailsSubCategory.findOne({
    subcategory,
    $or: [{ name: cleanName }, { slug }],
    isDeleted: false,
  });

  if (existingDetails) {
    return res.status(400).json({
      success: false,
      message: "This item already exists in this subcategory",
    });
  }

  const details = await DetailsSubCategory.create({
    name: cleanName,
    subcategory,
    slug,
  });

  return res.status(201).json({
    success: true,
    message: "Details subcategory created successfully",
    data: details,
  });
});

const getAllDetailsSubCategories = asyncHandler(async (req, res) => {
  const details = await DetailsSubCategory.find({
    isDeleted: false,
  })
    .populate("subcategory", "name slug")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: details.length,
    data: details,
  });
});

const getDetailsSubCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const details = await DetailsSubCategory.findOne({
    _id: id,
    isDeleted: false,
  }).populate("subcategory", "name slug");

  if (!details) {
    return res.status(404).json({
      success: false,
      message: "Details subcategory not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: details,
  });
});

const getDetailsBySubCategory = asyncHandler(async (req, res) => {
  const { subCategoryId } = req.params;

  const subCategory = await SubCategory.findOne({
    _id: subCategoryId,
    isDeleted: false,
  });

  if (!subCategory) {
    return res.status(404).json({
      success: false,
      message: "SubCategory not found",
    });
  }

  const details = await DetailsSubCategory.find({
    subcategory: subCategoryId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: details.length,
    data: details,
  });
});

const updateDetailsSubCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, subcategory } = req.body;

  if (!name || !subcategory) {
    return res.status(400).json({
      success: false,
      message: "Name and subcategory are required",
    });
  }

  const details = await DetailsSubCategory.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!details) {
    return res.status(404).json({
      success: false,
      message: "Details subcategory not found",
    });
  }

  const existingSubCategory = await SubCategory.findOne({
    _id: subcategory,
    isDeleted: false,
  });

  if (!existingSubCategory) {
    return res.status(404).json({
      success: false,
      message: "SubCategory not found",
    });
  }

  const cleanName = name.trim();
  const slug = slugify(cleanName);

  const duplicate = await DetailsSubCategory.findOne({
    _id: { $ne: id },
    subcategory,
    $or: [{ name: cleanName }, { slug }],
    isDeleted: false,
  });

  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: "This item already exists in this subcategory",
    });
  }

  details.name = cleanName;
  details.subcategory = subcategory;
  details.slug = slug;

  await details.save();

  return res.status(200).json({
    success: true,
    message: "Details subcategory updated successfully",
    data: details,
  });
});

const deleteDetailsSubCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const details = await DetailsSubCategory.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!details) {
    return res.status(404).json({
      success: false,
      message: "Details subcategory not found",
    });
  }

  details.isDeleted = true;

  await details.save();

  return res.status(200).json({
    success: true,
    message: "Details subcategory deleted successfully",
    data: null,
  });
});

module.exports = {
  createDetailsSubCategory,
  getAllDetailsSubCategories,
  getDetailsSubCategoryById,
  getDetailsBySubCategory,
  updateDetailsSubCategory,
  deleteDetailsSubCategory,
};
