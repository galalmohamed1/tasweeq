const asyncHandler = require("../middlewares/asyncHandler");

const SubCategory = require("../models/SubCategory");
const Category = require("../models/Category");
const Product = require("../models/Product");

const slugify = require("../utils/slugify");


const createSubCategory = asyncHandler(async (req, res) => {

    const { name, category } = req.body;

    if (!name || !category) {
        return res.status(400).json({
            success: false,
            message: "SubCategory name and category are required"
        });
    }

    const existingCategory = await Category.findOne({
        _id: category,
        isDeleted: false
    });

    if (!existingCategory) {
        return res.status(404).json({
            success: false,
            message: "Category not found"
        });
    }

    const cleanName = name.trim();
    const slug = slugify(cleanName);

    const existingSubCategory = await SubCategory.findOne({
        category,
        $or: [{ name: cleanName }, { slug }],
        isDeleted: false
    });

    if (existingSubCategory) {
        return res.status(400).json({
            success: false,
            message: "SubCategory already exists in this category"
        });
    }

    const subCategory = await SubCategory.create({
        name: cleanName,
        category,
        slug
    });

    return res.status(201).json({
        success: true,
        message: "SubCategory created successfully",
        data: subCategory
    });
});


const getAllSubCategories = asyncHandler(async (req, res) => {

    const subCategories = await SubCategory.find({
        isDeleted: false
    })
        .populate("category", "title slug")
        .sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        count: subCategories.length,
        data: subCategories
    });
});


const getSubCategoryById = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const subCategory = await SubCategory.findOne({
        _id: id,
        isDeleted: false
    }).populate("category", "title slug");

    if (!subCategory) {
        return res.status(404).json({
            success: false,
            message: "SubCategory not found"
        });
    }

    return res.status(200).json({
        success: true,
        data: subCategory
    });
});


const getSubCategoriesByCategory = asyncHandler(async (req, res) => {

    const { categoryId } = req.params;

    const category = await Category.findOne({
        _id: categoryId,
        isDeleted: false
    });

    if (!category) {
        return res.status(404).json({
            success: false,
            message: "Category not found"
        });
    }

    const subCategories = await SubCategory.find({
        category: categoryId,
        isDeleted: false
    }).sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        count: subCategories.length,
        data: subCategories
    });
});


const updateSubCategory = asyncHandler(async (req, res) => {

    const { id } = req.params;
    const { name, category } = req.body;

    if (!name || !category) {
        return res.status(400).json({
            success: false,
            message: "SubCategory name and category are required"
        });
    }

    const subCategory = await SubCategory.findOne({
        _id: id,
        isDeleted: false
    });

    if (!subCategory) {
        return res.status(404).json({
            success: false,
            message: "SubCategory not found"
        });
    }

    const existingCategory = await Category.findOne({
        _id: category,
        isDeleted: false
    });

    if (!existingCategory) {
        return res.status(404).json({
            success: false,
            message: "Category not found"
        });
    }

    // لو الـ category اتغيرت والـ subcategory فيها منتجات، نرفض
    if (String(subCategory.category) !== String(category)) {
        const hasProducts = await Product.exists({
            subCategory: id,
            isDeleted: false
        });

        if (hasProducts) {
            return res.status(400).json({
                success: false,
                message: "Can't move a subcategory that has products"
            });
        }
    }

    const cleanName = name.trim();
    const slug = slugify(cleanName);

    const existingSubCategory = await SubCategory.findOne({
        _id: { $ne: id },
        category,
        $or: [{ name: cleanName }, { slug }],
        isDeleted: false
    });

    if (existingSubCategory) {
        return res.status(400).json({
            success: false,
            message: "SubCategory already exists in this category"
        });
    }

    subCategory.name = cleanName;
    subCategory.category = category;
    subCategory.slug = slug;

    await subCategory.save();

    return res.status(200).json({
        success: true,
        message: "SubCategory updated successfully",
        data: subCategory
    });
});


const deleteSubCategory = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const subCategory = await SubCategory.findOne({
        _id: id,
        isDeleted: false
    });

    if (!subCategory) {
        return res.status(404).json({
            success: false,
            message: "SubCategory not found"
        });
    }

    // نمنع الحذف لو فيه منتجات تابعة
    const hasProducts = await Product.exists({
        subCategory: id,
        isDeleted: false
    });

    if (hasProducts) {
        return res.status(400).json({
            success: false,
            message: "Delete or move the related products first"
        });
    }

    subCategory.isDeleted = true;

    await subCategory.save();

    return res.status(200).json({
        success: true,
        message: "SubCategory deleted successfully",
        data: null
    });
});


module.exports = {
    createSubCategory,
    getAllSubCategories,
    getSubCategoryById,
    getSubCategoriesByCategory,
    updateSubCategory,
    deleteSubCategory
};