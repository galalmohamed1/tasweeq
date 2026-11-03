const Product = require("../models/Product");
const SubCategory = require("../models/SubCategory");
const slugify = require("slugify");
const DetailsSubCategory = require("../models/detailsSubCategory");
const cloudinary = require("../config/cloudinary");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// أقصى حد للسعر بعد الخصم من السعر الأصلي (125%)
const MAX_DISCOUNT_RATIO = 1.25;

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

// الأدوار اللي مسموح لها تشوف السعر الأصلي (سعر التكلفة)
const COST_VISIBLE_ROLES = ["admin", "accountant"];
const originalPriceSelect = (req) =>
  COST_VISIBLE_ROLES.includes(req.user?.role)
    ? "+priceOriginal"
    : "-priceOriginal";

const round2 = (n) => Math.round(n * 100) / 100;
const isEmpty = (v) => v === undefined || v === null || v === "";

// بتحسب سعر الخصم والنسبة المئوية وتفحص الحدود
// بترجّع { error } أو { error: null, discountPrice, discountPercentage }
const resolveDiscount = ({
  price,
  priceOriginal,
  discountPrice,
  discountPercentage,
}) => {
  const p = Number(price);
  let d = 0;
  let pct = 0;

  if (!isEmpty(discountPercentage) && Number(discountPercentage) > 0) {
    // الأساس هو النسبة المئوية
    pct = Number(discountPercentage);
    if (Number.isNaN(pct) || pct >= 100) {
      return { error: "نسبة الخصم يجب أن تكون أكبر من 0 وأقل من 100" };
    }
    d = round2(p - (p * pct) / 100);
  } else if (!isEmpty(discountPrice) && Number(discountPrice) > 0) {
    // الأساس هو سعر الخصم
    d = Number(discountPrice);
    if (Number.isNaN(d)) return { error: "سعر الخصم غير صالح" };
    if (d >= p) return { error: "سعر الخصم يجب أن يكون أقل من السعر" };
    pct = round2(((p - d) / p) * 100);
  }

  if (d > 0) {
    if (d >= p) return { error: "سعر الخصم يجب أن يكون أقل من السعر" };

    // السعر بعد الخصم ميعدّيش 125% من السعر الأصلي
    if (!isEmpty(priceOriginal) && !Number.isNaN(Number(priceOriginal))) {
      const limit = Number(priceOriginal) * MAX_DISCOUNT_RATIO;
      if (d >= limit) {
        return {
          error: `السعر بعد الخصم (${d}) تعدّى الحد المسموح (${limit}) وهو 125% من السعر الأصلي`,
        };
      }
    }
  }

  return { error: null, discountPrice: d, discountPercentage: pct };
};

exports.createProduct = async (req, res) => {
  let uploadedImages = [];
  try {
    const {
      title,
      description,
      price,
      priceOriginal,
      discountPrice,
      discountPercentage,
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

    const pricing = resolveDiscount({
      price,
      priceOriginal,
      discountPrice,
      discountPercentage,
    });
    if (pricing.error) {
      return res.status(400).json({ message: pricing.error });
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
      priceOriginal,
      discountPrice: pricing.discountPrice,
      discountPercentage: pricing.discountPercentage,
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
      "priceOriginal",
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

    // ===== الأسعار والخصم =====
    // الأولوية: النسبة المبعوتة ← سعر الخصم المبعوت ← نفس الخصم القديم (لو السعر اتغير)
    let discountInput;
    if (req.body.discountPercentage !== undefined) {
      discountInput = { discountPercentage: req.body.discountPercentage };
    } else if (req.body.discountPrice !== undefined) {
      discountInput = { discountPrice: req.body.discountPrice };
    } else if (product.discountPercentage > 0) {
      discountInput = { discountPercentage: product.discountPercentage };
    } else {
      discountInput = { discountPrice: product.discountPrice };
    }

    const pricing = resolveDiscount({
      price: product.price,
      priceOriginal: product.priceOriginal,
      ...discountInput,
    });
    if (pricing.error) {
      return res.status(400).json({ message: pricing.error });
    }
    product.discountPrice = pricing.discountPrice;
    product.discountPercentage = pricing.discountPercentage;

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

    // ===== الصور =====
    // existingImages: لستة public_id للصور القديمة اللي عايز تحتفظ بيها
    // images (files): الصور الجديدة اللي هتتضاف
    const oldImages = [...product.images];
    const imageFiles = req.files?.images || [];
    const keepIds = toArray(req.body.existingImages);

    let imagesToDelete = [];

    if (imageFiles.length || keepIds !== undefined) {
      // لو existingImages مش مبعوتة، نحتفظ بكل الصور القديمة ونضيف عليها
      const kept =
        keepIds === undefined
          ? oldImages
          : oldImages.filter((img) => keepIds.includes(img.public_id));

      // لازم يفضل صورة واحدة على الأقل (قبل ما نرفع أي حاجة)
      if (kept.length + imageFiles.length === 0) {
        return res
          .status(400)
          .json({ message: "صورة واحدة على الأقل مطلوبة" });
      }

      imagesToDelete = oldImages.filter((img) => !kept.includes(img));

      if (imageFiles.length) newImages = await uploadImages(imageFiles);

      product.images = [...kept.map((img) => img.toObject()), ...newImages];
    }

    await product.save();

    // نمسح الصور المحذوفة من Cloudinary بعد نجاح الحفظ بس
    if (imagesToDelete.length) await removeImages(imagesToDelete);

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
        .select(originalPriceSelect(req)) // السعر الأصلي للأدمن والمحاسب بس
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
      .select(originalPriceSelect(req)) // السعر الأصلي للأدمن والمحاسب بس
      .populate("category", "title slug")
      .populate("subCategory", "name slug")
      .populate("detailsSubCategory", "name slug");

    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};