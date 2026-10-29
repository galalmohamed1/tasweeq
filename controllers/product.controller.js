const Product = require("../models/Product");
const SubCategory = require("../models/SubCategory");
const slugify = require("slugify");
const DetailsSubCategory = require("../models/detailsSubCategory");
const cloudinary = require("../config/cloudinary");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// مسح صورة من Cloudinary (مبيرميش error لو مش موجودة)
const deleteFile = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (_) {}
};

const toArray = (value) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [value];
  }
};

// يرفع مجموعة صور لـ Cloudinary ويرجّع [{ public_id, secure_url }]
const uploadImages = (files = []) =>
  Promise.all(
    files.map((f) => uploadToCloudinary(f.buffer, "ecommerce/products")),
  );

const removeImages = (images = []) =>
  Promise.all(images.map((i) => deleteFile(i.public_id)));

exports.createProduct = async (req, res) => {
  let uploadedImages = [];
  try {
    const {
      title,
      description,
      price,
      discountPrice,
      stock,
      category,
      subCategory,
      isFeatured,
      isActive,
      detailsSubCategory,
    } = req.body;

    const sizes = toArray(req.body.sizes);
    const colors = toArray(req.body.colors);

    const imageFiles = req.files?.images || [];

    // كل الفحوصات الأول، وبعدها نرفع (عشان منرفعش صور ونرميها)
    if (!title) {
      return res.status(400).json({ message: "العنوان مطلوب" });
    }
    if (!imageFiles.length) {
      return res.status(400).json({ message: "صورة واحدة على الأقل مطلوبة" });
    }
    const sub = await SubCategory.findOne({ _id: subCategory, category });
    if (!sub) {
      return res
        .status(400)
        .json({ message: "SubCategory لا تنتمي لهذه الـ Category" });
    }
    if (detailsSubCategory) {
      const details = await DetailsSubCategory.findOne({
        _id: detailsSubCategory,
        subcategory: subCategory,
        isDeleted: false,
      });
      if (!details) {
        return res
          .status(400)
          .json({ message: "Details لا تنتمي لهذه الـ SubCategory" });
      }
    }

    uploadedImages = await uploadImages(imageFiles);

    const product = await Product.create({
      title,
      slug: slugify(title, { lower: true, strict: true }),
      description,
      price,
      discountPrice,
      stock,
      sizes,
      colors,
      images: uploadedImages,
      category,
      subCategory,
      isFeatured,
      detailsSubCategory,
      isActive,
    });

    res.status(201).json(product);
  } catch (err) {
    await removeImages(uploadedImages); // لو فشل الحفظ نمسح الصور من Cloudinary

    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "المنتج ده موجود بالفعل (slug مكرر)" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true },
    );
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });
    res.json({ message: "تم الحذف" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  let newImages = [];
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    const allowedFields = [
      "title",
      "description",
      "price",
      "discountPrice",
      "stock",
      "category",
      "subCategory",
      "isFeatured",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    if (req.body.detailsSubCategory !== undefined) {
      product.detailsSubCategory = req.body.detailsSubCategory || null;
    }

    if (req.body.sizes !== undefined) product.sizes = toArray(req.body.sizes);
    if (req.body.colors !== undefined)
      product.colors = toArray(req.body.colors);

    // لو الـ category أو الـ subCategory اتغيروا، نتأكد إنهم متطابقين
    if (
      req.body.category !== undefined ||
      req.body.subCategory !== undefined ||
      req.body.detailsSubCategory !== undefined
    ) {
      const sub = await SubCategory.findOne({
        _id: product.subCategory,
        category: product.category,
        isDeleted: false,
      });
      if (!sub) {
        return res
          .status(400)
          .json({ message: "SubCategory لا تنتمي لهذه الـ Category" });
      }
      if (product.detailsSubCategory) {
        const details = await DetailsSubCategory.findOne({
          _id: product.detailsSubCategory,
          subcategory: product.subCategory,
          isDeleted: false,
        });
        if (!details) {
          return res
            .status(400)
            .json({ message: "Details لا تنتمي لهذه الـ SubCategory" });
        }
      }
    }

    if (req.body.title !== undefined && product.isModified("title")) {
      product.slug = slugify(product.title, { lower: true, strict: true });
    }

    // الصور الجديدة بتستبدل القديمة (زي ما الفرونت بيقول للمستخدم)
    // لو عاوزها تتضاف على القديمة: استبدل السطر بـ product.images.push(...newImages)
    const oldImages = [...product.images];
    const imageFiles = req.files?.images || [];

    if (imageFiles.length) {
      newImages = await uploadImages(imageFiles);
      product.images = newImages;
    }

    await product.save();

    // نمسح الصور القديمة بعد نجاح الحفظ بس
    if (newImages.length) await removeImages(oldImages);

    await product.populate([
      { path: "category", select: "title slug" },
      { path: "subCategory", select: "name slug" },
      { path: "detailsSubCategory", select: "name slug" },
    ]);

    res.json(product);
  } catch (err) {
    await removeImages(newImages); // لو فشل الحفظ نمسح الصور الجديدة

    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "المنتج ده موجود بالفعل (slug مكرر)" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subCategory,
      minPrice,
      maxPrice,
      sort = "-createdAt",
      search,
    } = req.query;

    const filter = { isDeleted: false, isActive: true };
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "title slug")
        .populate("subCategory", "name slug")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isDeleted: false,
      isActive: true,
    })
      .populate("category", "title slug")
      .populate("subCategory", "name slug")
      .populate("detailsSubCategory", "name slug");

    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};