const asyncHandler = require("../middlewares/asyncHandler");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");
const slugify = require("../utils/slugify");
const cloudinary = require("../config/cloudinary");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// يرفع الصورة لـ Cloudinary ويرجّع { public_id, secure_url } المطابق للـ imageSchema
const uploadCategoryImage = (file) =>
    uploadToCloudinary(file.buffer, "ecommerce/categories");

// مسح صورة من Cloudinary (مبيرميش error لو مش موجودة)
const deleteFile = async (publicId) => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (_) {}
};

// ==================== Create Category ====================

const createCategory = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description || !req.file) {
        return res.status(400).json({
            success: false,
            message: "Category title, description and image are required"
        });
    }

    const cleanTitle = title.trim();
    const slug = slugify(cleanTitle) || `category-${Date.now()}`;

    const existingCategory = await Category.findOne({
        $or: [{ title: cleanTitle }, { slug }],
        isDeleted: false
    });

    if (existingCategory) {
        return res.status(400).json({
            success: false,
            message: "Category already exists"
        });
    }

    // نرفع الصورة بعد ما كل الفحوصات تعدّي
    const image = await uploadCategoryImage(req.file);

    try {
        const category = await Category.create({
            title: cleanTitle,
            slug,
            description,
            image
        });

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category
        });
    } catch (error) {
        await deleteFile(image.public_id); // لو فشل الحفظ نمسح الصورة
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
    const { slug } = req.params;
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
    const { id } = req.params;
    const category = await Category.findOne({
        _id: id,
        isDeleted: false
    });

    if (!category) {
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

    const cleanTitle = title.trim();
    const slug = slugify(cleanTitle) || `category-${Date.now()}`;

    // نتأكد إن مفيش category تانية بنفس الاسم
    const duplicate = await Category.findOne({
        _id: { $ne: category._id },
        $or: [{ title: cleanTitle }, { slug }],
        isDeleted: false
    });

    if (duplicate) {
        return res.status(400).json({
            success: false,
            message: "Category already exists"
        });
    }

    category.title = cleanTitle;
    category.slug = slug;
    if (description !== undefined) category.description = description;

    const oldImageId = category.image?.public_id;
    let newImage = null;

    if (req.file) {
        newImage = await uploadCategoryImage(req.file);
        category.image = newImage;
    }

    try {
        await category.save();
    } catch (error) {
        if (newImage) await deleteFile(newImage.public_id);
        throw error;
    }

    // نمسح الصورة القديمة بعد نجاح الحفظ بس
    if (newImage) await deleteFile(oldImageId);

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