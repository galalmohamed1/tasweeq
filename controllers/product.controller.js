const Product = require("../models/Product");
const SubCategory = require("../models/SubCategory");
const slugify = require("slugify");
const fs = require("fs");

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

// يمسح الملفات اللي اترفعت لو العملية فشلت
const removeUploadedFiles = (req) => {
    Object.values(req.files || {})
        .flat()
        .forEach((f) => fs.unlink(f.path, () => {}));
};

exports.createProduct = async (req, res) => {
    try {
        // مش بناخد averageRating / numReviews / isDeleted من الـ body
        const {
            title, description, price, discountPrice, stock,
            category, subCategory, isFeatured, isActive,detailsSubCategory
        } = req.body;

        const sizes = toArray(req.body.sizes);
        const colors = toArray(req.body.colors);

        // الصور والفيديوهات بتيجي من req.files مش من req.body
        const images = (req.files?.images || []).map((f) => ({
            public_id: f.filename,
            secure_url: `/uploads/${f.filename}`
        }));
        const videos = (req.files?.videos || []).map((f) => `/uploads/${f.filename}`);

        if (!title) {
            removeUploadedFiles(req);
            return res.status(400).json({ message: "العنوان مطلوب" });
        }
        const sub = await SubCategory.findOne({ _id: subCategory, category });
        if (!sub) {
            removeUploadedFiles(req);
            return res.status(400).json({ message: "SubCategory لا تنتمي لهذه الـ Category" });
        }
        if (detailsSubCategory) {
            const details = await DetailsSubCategory.findOne({
                _id: detailsSubCategory,
                subcategory: subCategory,
                isDeleted: false
            });
            if (!details) {
                removeUploadedFiles(req);
                return res.status(400).json({ message: "Details لا تنتمي لهذه الـ SubCategory" });
            }
        }

        const product = await Product.create({
            title,
            slug: slugify(title, { lower: true, strict: true }),
            description, price, discountPrice, stock,
            sizes, colors, images, videos,
            category, subCategory, isFeatured, detailsSubCategory, isActive
        });

        res.status(201).json(product);
    } catch (err) {
        removeUploadedFiles(req);

        if (err.code === 11000) {
            return res.status(409).json({ message: "المنتج ده موجود بالفعل (slug مكرر)" });
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
            { new: true }
        );
        if (!product) return res.status(404).json({ message: "المنتج غير موجود" });
        res.json({ message: "تم الحذف" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
        if (!product) {
            removeUploadedFiles(req);
            return res.status(404).json({ message: "المنتج غير موجود" });
        }

        // شلنا images و videos من هنا لأنها بتيجي من req.files
        const allowedFields = [
            "title", "description", "price", "discountPrice", "stock",
            "category", "subCategory", "isFeatured", "isActive"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                product[field] = req.body[field];
            }
        });

        if (req.body.detailsSubCategory !== undefined) {
            product.detailsSubCategory = req.body.detailsSubCategory || null;
        }

        // sizes و colors جايين كنص من form-data
        if (req.body.sizes !== undefined) product.sizes = toArray(req.body.sizes);
        if (req.body.colors !== undefined) product.colors = toArray(req.body.colors);

        // الملفات الجديدة بتتضاف على القديمة
        const newImages = (req.files?.images || []).map((f) => ({
            public_id: f.filename,
            secure_url: `/uploads/${f.filename}`
        }));
        const newVideos = (req.files?.videos || []).map((f) => `/uploads/${f.filename}`);

        if (newImages.length) product.images.push(...newImages);
        if (newVideos.length) product.videos.push(...newVideos);

        // لو الـ category أو الـ subCategory اتغيروا، نتأكد إنهم متطابقين
        if (req.body.category !== undefined || req.body.subCategory !== undefined || req.body.detailsSubCategory !== undefined) {
            const sub = await SubCategory.findOne({
                _id: product.subCategory,
                category: product.category,
                isDeleted: false
            });
            if (!sub) {
                removeUploadedFiles(req);
                return res.status(400).json({ message: "SubCategory لا تنتمي لهذه الـ Category" });
            }
            if (product.detailsSubCategory) {
                const details = await DetailsSubCategory.findOne({
                    _id: product.detailsSubCategory,
                    subcategory: product.subCategory,
                    isDeleted: false
                });
                if (!details) {
                    removeUploadedFiles(req);
                    return res.status(400).json({ message: "Details لا تنتمي لهذه الـ SubCategory" });
                }
            }
        }

        // لو الـ title اتغير، نحدّث الـ slug
        if (req.body.title !== undefined && product.isModified("title")) {
            product.slug = slugify(product.title, { lower: true, strict: true });
        }

        await product.save(); // بيشغّل الـ validators كلها (زي discountPrice)

        await product.populate([
            { path: "category", select: "title slug" },
            { path: "subCategory", select: "name slug" },
            { path: "detailsSubCategory", select: "name slug" }
        ]);

        res.json(product);
    } catch (err) {
        removeUploadedFiles(req);

        if (err.code === 11000) {
            return res.status(409).json({ message: "المنتج ده موجود بالفعل (slug مكرر)" });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: err.message });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 12, category, subCategory, minPrice, maxPrice, sort = "-createdAt", search } = req.query;

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
            Product.countDocuments(filter)
        ]);

        res.json({
            products,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getProductBySlug = async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug, isDeleted: false, isActive: true })
            .populate("category", "name slug")
            .populate("subCategory", "name slug");

        if (!product) return res.status(404).json({ message: "المنتج غير موجود" });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

