const Order = require("../models/Order");
const Product = require("../models/Product");
const ShippingFee = require("../models/ShippingFee");

const STAFF_ROLES = ["admin", "accountant", "warehouse"];

// الانتقالات المسموحة حسب طريقة الدفع
const TRANSITIONS = {
    CreditCard: {
        Pending: ["Paid", "Cancelled"],
        Paid: ["Preparing", "Cancelled"],
        Preparing: ["Shipped", "Cancelled"],
        Shipped: ["Delivered"]
    },
    CashOnDelivery: {
        Pending: ["Preparing", "Cancelled"],
        Preparing: ["Shipped", "Cancelled"],
        Shipped: ["Delivered"]
    }
};

// مين يقدر يوصّل الأوردر للحالة دي
const ROLES_BY_TARGET = {
    Paid: ["accountant", "admin"],
    Preparing: ["warehouse", "admin"],
    Shipped: ["warehouse", "admin"],
    Delivered: ["warehouse", "admin"],
    Cancelled: ["user", "accountant", "admin"]
};

const generateOrderNumber = () =>
    `ORD-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;

// ترجيع المخزون
const restoreStock = (items) =>
    Product.bulkWrite(
        items.map((i) => ({
            updateOne: {
                filter: { _id: i.product },
                update: { $inc: { stock: i.quantity } }
            }
        }))
    );

// ---------------------------------------------------------
// POST /api/orders  (أي يوزر مسجل دخول)
// body: { items: [{ product, quantity, size, color }], shippingAddress, paymentMethod }
// ---------------------------------------------------------
exports.createOrder = async (req, res) => {
    const reserved = []; // المنتجات اللي اتخصم منها مخزون (للتراجع لو حصل فشل)

    try {
        const { items, shippingAddress, paymentMethod } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "الأوردر لازم يحتوي على منتج واحد على الأقل" });
        }

        // مصاريف الشحن بتتجاب من الداتابيز (الأدمن هو اللي حددها)، مش من الـ body
        const feeDoc = await ShippingFee.findOne({ key: "main" });
        const shippingFee = feeDoc ? Number(feeDoc.shippingFee) : 0;

        const orderItems = [];
        let totalPrice = 0;

        for (const item of items) {
            const quantity = Number(item.quantity);
            if (!Number.isInteger(quantity) || quantity < 1) {
                throw { status: 400, message: "الكمية لازم تكون رقم صحيح أكبر من 0" };
            }

            const product = await Product.findOne({ _id: item.product, isDeleted: false, isActive: true });
            if (!product) {
                throw { status: 404, message: "منتج غير متاح أو غير موجود" };
            }

            if (item.size && !product.sizes.includes(item.size)) {
                throw { status: 400, message: `المقاس غير متاح للمنتج: ${product.title}` };
            }
            if (item.color && !product.colors.includes(item.color)) {
                throw { status: 400, message: `اللون غير متاح للمنتج: ${product.title}` };
            }

            // خصم المخزون بشكل atomic (مفيش أوردرين يشتروا آخر قطعة)
            const updated = await Product.findOneAndUpdate(
                { _id: product._id, stock: { $gte: quantity } },
                { $inc: { stock: -quantity } }
            );
            if (!updated) {
                throw { status: 400, message: `الكمية المطلوبة غير متوفرة للمنتج: ${product.title}` };
            }
            reserved.push({ product: product._id, quantity });

            // السعر بيتحسب من الداتابيز مش من الـ body
            const unitPrice = product.discountPrice > 0 ? product.discountPrice : product.price;
            totalPrice += unitPrice * quantity;

            orderItems.push({
                product: product._id,
                title: product.title,
                image: product.images?.[0]?.url,
                quantity,
                price: unitPrice,
                size: item.size,
                color: item.color
            });
        }

        const discountAmount = 0; // الكوبونات لسه متضافتش
        const finalPrice = totalPrice + shippingFee - discountAmount;

        const order = await Order.create({
            orderNumber: generateOrderNumber(),
            user: req.user._id,
            items: orderItems,
            shippingAddress,
            paymentMethod, // الـ enum في الـ schema بيرفض أي قيمة غلط
            totalPrice,
            shippingFee,
            discountAmount,
            finalPrice,
            orderStatus: "Pending",
            statusHistory: [{ status: "Pending", changedBy: req.user._id }]
        });

        res.status(201).json({ success: true, message: "تم إنشاء الأوردر", data: order });
    } catch (err) {
        // لو حصل أي فشل نرجّع المخزون اللي اتخصم
        if (reserved.length) {
            await restoreStock(reserved).catch(() => {});
        }

        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

// ---------------------------------------------------------
// GET /api/orders/my  (طلباتي)
// ---------------------------------------------------------
exports.getMyOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = { user: req.user._id, isDeleted: false };

        const [orders, total] = await Promise.all([
            Order.find(filter).sort("-createdAt").skip(skip).limit(Number(limit)),
            Order.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: { orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ---------------------------------------------------------
// GET /api/orders  (موظفين فقط) — ?status=Pending&page=1&limit=20
// ---------------------------------------------------------
exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = { isDeleted: false };
        if (status) filter.orderStatus = status;

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate("user", "name email phoneNumber")
                .sort("-createdAt")
                .skip(skip)
                .limit(Number(limit)),
            Order.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: { orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ---------------------------------------------------------
// GET /api/orders/:id  (صاحب الأوردر أو موظف)
// ---------------------------------------------------------
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, isDeleted: false })
            .populate("user", "name email phoneNumber")
            .populate("statusHistory.changedBy", "name role");

        if (!order) return res.status(404).json({ success: false, message: "الأوردر غير موجود" });

        const isOwner = order.user._id.equals(req.user._id);
        if (!isOwner && !STAFF_ROLES.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "غير مسموح لك بعرض هذا الأوردر" });
        }

        res.json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ---------------------------------------------------------
// PATCH /api/orders/:id/status   body: { status: "Preparing" }
// ---------------------------------------------------------
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const role = req.user.role;

        const order = await Order.findOne({ _id: req.params.id, isDeleted: false });
        if (!order) return res.status(404).json({ success: false, message: "الأوردر غير موجود" });

        // 1) الانتقال مسموح؟
        const allowedNext = TRANSITIONS[order.paymentMethod]?.[order.orderStatus] || [];
        if (!allowedNext.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `مينفعش تنقل الأوردر من ${order.orderStatus} إلى ${status}`
            });
        }

        // 2) الدور مسموح؟
        if (!ROLES_BY_TARGET[status]?.includes(role)) {
            return res.status(403).json({ success: false, message: "غير مسموح لك بهذا الإجراء" });
        }

        // 3) قواعد الإلغاء
        if (status === "Cancelled") {
            if (role === "user" && !order.user.equals(req.user._id)) {
                return res.status(403).json({ success: false, message: "تقدر تلغي أوردراتك بس" });
            }
            if (["user", "accountant"].includes(role) && order.orderStatus !== "Pending") {
                return res.status(403).json({ success: false, message: "الإلغاء بعد مرحلة Pending للأدمن فقط" });
            }
        }

        const update = {
            $set: { orderStatus: status },
            $push: { statusHistory: { status, changedBy: req.user._id, changedAt: new Date() } }
        };

        // الدفع: كارت = عند Paid، كاش = عند Delivered
        if (status === "Paid" || (status === "Delivered" && !order.isPaid)) {
            update.$set.isPaid = true;
            update.$set.paidAt = new Date();
        }

        // الشرط على الحالة الحالية يمنع طلبين متزامنين من تغيير الحالة مرتين
        const updated = await Order.findOneAndUpdate(
            { _id: order._id, orderStatus: order.orderStatus },
            update,
            { new: true }
        );
        if (!updated) {
            return res.status(409).json({ success: false, message: "حالة الأوردر اتغيرت، حدّث الصفحة وجرب تاني" });
        }

        if (status === "Cancelled") {
            await restoreStock(order.items);
        }

        res.json({ success: true, message: `تم تغيير الحالة إلى ${status}`, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};