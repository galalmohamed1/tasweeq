const fs = require("fs");
const path = require("path");
const asyncHandler = require("../middlewares/asyncHandler");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");
const slugify = require("../utils/slugify");

// شكل الصورة المطابق للـ imageSchema
const buildImage = (file) => ({
    public_id: file.filename,
    secure_url: `/uploads/${file.filename}`
});

const removeFile = (filename) => {
    if (!filename) return;
    fs.unlink(path.join("uploads", filename), () => {});
};

// ==================== Create Category ====================

const createCategory = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description || !req.file) {
        if (req.file) removeFile(req.file.filename);
        return res.status(400).json({
            success: false,
            message: "Category title, description and image are required"
        });
    }

    const cleanTitle = title.trim();
    const slug = slugify(cleanTitle);

    const existingCategory = await Category.findOne({
        $or: [{ title: cleanTitle }, { slug }],
        isDeleted: false
    });

    if (existingCategory) {
        removeFile(req.file.filename);
        return res.status(400).json({
            success: false,
            message: "Category already exists"
        });
    }

    try {
        const category = await Category.create({
            title: cleanTitle,
            slug,
            description,
            image: buildImage(req.file)
        });

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category
        });
    } catch (error) {
        removeFile(req.file.filename); // لو فشل الحفظ نمسح الصورة
        throw error;
    }
});

// ==================== Get All Categories ====================

const getAllCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find({ isDeleted: false }).sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
    });
});

// ==================== Get Category By Slug ====================

const getCategoryBySlug = asyncHandler(async (req, res) => {
    const { slug }= req.params;
    const category = await Category.findOne({
        slug,
        isDeleted: false
    });

    if (!category) {
        return res.status(404).json({
            success: false,
            message: "Category not found"
        });
    }

    return res.status(200).json({
        success: true,
        data: category
    });
});

// ==================== Update Category ====================

const updateCategory = asyncHandler(async (req, res) => {
    const { id }= req.params;
    const category = await Category.findOne({
        _id: id,
        isDeleted: false
    });

    if (!category) {
        if (req.file) removeFile(req.file.filename);
        return res.status(404).json({
            success: false,
            message: "Category not found"
        });
    }

    const { title, description } = req.body;

    if (!title) {
        return res.status(400).json({
            success: false,
            message: "Category name is required"
        });
    }

    if (title !== undefined) {
        const cleanTitle = title.trim();
        const slug = slugify(cleanTitle);

        // نتأكد إن مفيش category تانية بنفس الاسم
        const duplicate = await Category.findOne({
            _id: { $ne: category._id },
            $or: [{ title: cleanTitle }, { slug }],
            isDeleted: false
        });

        if (duplicate) {
            if (req.file) removeFile(req.file.filename);
            return res.status(400).json({
                success: false,
                message: "Category already exists"
            });
        }

        category.title = cleanTitle;
        category.slug = slug;
    }

    if (description !== undefined) category.description = description;

    const oldImageId = category.image?.public_id;
    if (req.file) category.image = buildImage(req.file);

    try {
        await category.save();
    } catch (error) {
        if (req.file) removeFile(req.file.filename);
        throw error;
    }

    // نمسح الصورة القديمة بعد نجاح الحفظ بس
    if (req.file) removeFile(oldImageId);

    return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: category
    });
});

// ==================== Delete Category ====================

const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hasSubs = await SubCategory.exists({
        category: id,
        isDeleted: false
    });

    if (hasSubs) {
        return res.status(400).json({
            success: false,
            message: "Delete the related subcategories first"
        });
    }

    const category = await Category.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
    );

    if (!category) {
        return res.status(404).json({
            success: false,
            message: "Category not found"
        });
    }

    return res.status(200).json({
        success: true,
        message: "Category deleted successfully"
    });
});

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryBySlug,
    updateCategory,
    deleteCategory
};