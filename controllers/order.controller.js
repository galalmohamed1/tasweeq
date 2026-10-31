const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const ShippingFee = require("../models/ShippingFee");
const User = require("../models/user.model");

// ---------------------------------------------------------
// الأدوار
// ---------------------------------------------------------
// بيشوفوا كل الأوردرات
const VIEW_ALL_ROLES = ["admin", "salesManager", "accountant", "warehouse"];
// اللي اسمهم بيتسجل في bookedBy
const SALES_ROLES = ["sales", "salesManager"];
// بيحجزوا أوردر نيابة عن عميل
const BOOKING_ROLES = [...SALES_ROLES, "admin"];
// أي موظف ليه صلاحية يفتح أوردر (السيلز بيشوف اللي حجزه بس)
const STAFF_ROLES = [...VIEW_ALL_ROLES, "sales"];

// ---------------------------------------------------------
// الحالات: الانتقالات المسموحة (مستقلة عن طريقة الدفع)
// ---------------------------------------------------------
const TRANSITIONS = {
  Pending: ["Preparing", "Cancelled"],
  Preparing: ["Shipped", "Cancelled"],
  Shipped: ["Delivered", "Refused"],
};

// مين يقدر يوصّل الأوردر للحالة دي
const ROLES_BY_TARGET = {
  Preparing: ["warehouse", "salesManager", "admin"], // تعبئة
  Shipped: ["warehouse", "salesManager", "admin"], // شحن (شركة أو مندوب)
  Delivered: ["courier", "accountant", "salesManager", "admin"], // اتسلم
  Refused: ["courier", "accountant", "salesManager", "admin"], // العميل رفض الاستلام
  Cancelled: ["user", "sales", "warehouse", "salesManager", "admin"],
};

const SHIPPING_METHODS = ["Company", "Courier"];

const generateOrderNumber = () =>
  `ORD-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;

// ترجيع المخزون
const restoreStock = (items) =>
  Product.bulkWrite(
    items.map((i) => ({
      updateOne: {
        filter: { _id: i.product },
        update: { $inc: { stock: i.quantity } },
      },
    })),
  );

// التحقق من بيانات الشحن (شركة أو مندوب)
const buildShipping = (shipping, userId) => {
  if (!shipping || !SHIPPING_METHODS.includes(shipping.method)) {
    return { error: "طريقة الشحن لازم تكون Company أو Courier" };
  }
  if (
    shipping.method === "Company" &&
    !String(shipping.companyName || "").trim()
  ) {
    return { error: "اسم شركة الشحن مطلوب" };
  }
  if (
    shipping.method === "Courier" &&
    !String(shipping.courierName || "").trim()
  ) {
    return { error: "اسم المندوب مطلوب" };
  }

  const value = {
    method: shipping.method,
    shippedAt: new Date(),
    shippedBy: userId,
  };
  ["companyName", "courierName", "courierPhone", "trackingNumber"].forEach(
    (key) => {
      if (shipping[key]) value[key] = String(shipping[key]).trim();
    },
  );
  return { value };
};

// ---------------------------------------------------------
// POST /api/orders
// user: بيحجز لنفسه (items من الـ cart)
// sales / salesManager / admin: بيحجزوا لعميل، و customerId اختياري
// body: { items: [{ product, quantity, size, color }], shippingAddress, paymentMethod, customerId? }
// الصلاحية (user / sales / salesManager / admin) بتتفحص في الـ route
// ---------------------------------------------------------
exports.createOrder = async (req, res) => {
  const reserved = []; // المنتجات اللي اتخصم منها مخزون (للتراجع لو حصل فشل)

  try {
    const { items, shippingAddress, paymentMethod, customerId } = req.body;
    const role = req.user.role;
    const isStaffBooking = BOOKING_ROLES.includes(role);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "الأوردر لازم يحتوي على منتج واحد على الأقل",
      });
    }

    // صاحب الأوردر + اسم اللي حجزه (بيتحددوا من الـ token مش من الـ body)
    const ownerData = {};
    if (isStaffBooking) {
      if (customerId) {
        if (!mongoose.isValidObjectId(customerId)) {
          return res
            .status(400)
            .json({ success: false, message: "customerId غير صالح" });
        }
        const customer = await User.exists({ _id: customerId });
        if (!customer) {
          return res
            .status(404)
            .json({ success: false, message: "العميل غير موجود" });
        }
        ownerData.user = customerId;
      }
      // bookedBy بيتسجل للسيلز ومدير المبيعات بس (الأدمن مش بيظهر اسمه تحت العميل)
      if (SALES_ROLES.includes(role)) {
        ownerData.bookedBy = { user: req.user._id, name: req.user.name, role };
      }
    } else {
      ownerData.user = req.user._id;
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

      // معرّف منتج غلط كان بيرمي CastError ويرجع 500
      if (!mongoose.isValidObjectId(item.product)) {
        throw { status: 400, message: "معرّف المنتج غير صالح" };
      }

      const product = await Product.findOne({
        _id: item.product,
        isDeleted: false,
        isActive: true,
      });
      if (!product) {
        throw { status: 404, message: "منتج غير متاح أو غير موجود" };
      }

      // المقاس واللون مطلوبين لو المنتج ليه مقاسات/ألوان
      // (المنتجات اللي من غير مقاسات أو ألوان مش بتتأثر)
      if (product.sizes.length > 0 && !product.sizes.includes(item.size)) {
        throw {
          status: 400,
          message: `اختار مقاس صحيح للمنتج: ${product.title}`,
        };
      }
      if (product.colors.length > 0 && !product.colors.includes(item.color)) {
        throw {
          status: 400,
          message: `اختار لون صحيح للمنتج: ${product.title}`,
        };
      }

      // خصم المخزون بشكل atomic (مفيش أوردرين يشتروا آخر قطعة)
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
      );
      if (!updated) {
        throw {
          status: 400,
          message: `الكمية المطلوبة غير متوفرة للمنتج: ${product.title}`,
        };
      }
      reserved.push({ product: product._id, quantity });

      // السعر بيتحسب من الداتابيز مش من الـ body
      const unitPrice =
        product.discountPrice > 0 ? product.discountPrice : product.price;
      totalPrice += unitPrice * quantity;

      orderItems.push({
        product: product._id,
        title: product.title,
        image: product.images?.[0]?.secure_url, // url → secure_url (حسب الـ imageSchema)
        quantity,
        price: unitPrice,
        // مقاس/لون يتخزنوا بس لو المنتج ليه مقاسات/ألوان
        size: product.sizes.length > 0 ? item.size : undefined,
        color: product.colors.length > 0 ? item.color : undefined,
      });
    }

    const discountAmount = 0; // الكوبونات لسه متضافتش
    const finalPrice = totalPrice + shippingFee - discountAmount;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      ...ownerData,
      items: orderItems,
      shippingAddress,
      paymentMethod, // الـ enum في الـ schema بيرفض أي قيمة غلط
      totalPrice,
      shippingFee,
      discountAmount,
      finalPrice,
      orderStatus: "Pending",
      statusHistory: [{ status: "Pending", changedBy: req.user._id }],
    });

    res
      .status(201)
      .json({ success: true, message: "تم إنشاء الأوردر", data: order });
  } catch (err) {
    // لو حصل أي فشل نرجّع المخزون اللي اتخصم
    if (reserved.length) {
      await restoreStock(reserved).catch(() => {});
    }

    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
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
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------------------------------------------------
// GET /api/orders  (موظفين فقط) — ?status=Pending&page=1&limit=20
// السيلز بيشوف الأوردرات اللي حجزها هو بس
// المندوب بيشوف الأوردرات المشحونة بس
// ---------------------------------------------------------
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { isDeleted: false };
    if (status) filter.orderStatus = status;
    if (req.user.role === "sales") filter["bookedBy.user"] = req.user._id;
    // المندوب يشوف الأوردرات المشحونة بس (حتى لو بعت status تاني)
    if (req.user.role === "courier") filter.orderStatus = "Shipped";

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email phoneNumber")
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------------------------------------------------
// GET /api/orders/:id  (صاحب الأوردر / السيلز اللي حجزه / باقي الموظفين / المندوب للمشحون)
// ---------------------------------------------------------
exports.getOrderById = async (req, res) => {
  try {
    // id غلط الشكل كان بيرجع 500
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "معرّف الأوردر غير صالح" });
    }

    const order = await Order.findOne({ _id: req.params.id, isDeleted: false })
      .populate("user", "name email phoneNumber")
      .populate("statusHistory.changedBy", "name role");

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "الأوردر غير موجود" });

    const role = req.user.role;
    const isOwner = order.user?._id?.equals(req.user._id);
    const isBooker = order.bookedBy?.user?.equals(req.user._id);
    const canViewAll = VIEW_ALL_ROLES.includes(role);
    const isCourierOnShipped =
      role === "courier" && order.orderStatus === "Shipped";

    if (
      !isOwner &&
      !canViewAll &&
      !(role === "sales" && isBooker) &&
      !isCourierOnShipped
    ) {
      return res
        .status(403)
        .json({ success: false, message: "غير مسموح لك بعرض هذا الأوردر" });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------------------------------------------------
// PATCH /api/orders/:id/status
// body: { status: "Preparing" }
//       { status: "Shipped", shipping: { method: "Company", companyName: "Aramex", trackingNumber } }
//       { status: "Shipped", shipping: { method: "Courier", courierName: "Ali", courierPhone } }
//       { status: "Refused", note: "العميل رفض الاستلام" }
// ---------------------------------------------------------
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, shipping, note } = req.body;
    const role = req.user.role;

    // تحقق من الحالة والـ id قبل أي حاجة
    if (!status) {
      return res.status(400).json({ success: false, message: "الحالة مطلوبة" });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "معرّف الأوردر غير صالح" });
    }

    const order = await Order.findOne({ _id: req.params.id, isDeleted: false });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "الأوردر غير موجود" });

    // 1) الانتقال مسموح؟
    const allowedNext = TRANSITIONS[order.orderStatus] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `مينفعش تنقل الأوردر من ${order.orderStatus} إلى ${status}`,
      });
    }

    // 2) الدور مسموح؟
    if (!ROLES_BY_TARGET[status]?.includes(role)) {
      return res
        .status(403)
        .json({ success: false, message: "غير مسموح لك بهذا الإجراء" });
    }

    // 3) العميل يلغي أوردره هو بس، وهو قيد الانتظار فقط
    if (status === "Cancelled" && role === "user") {
      if (!order.user?.equals(req.user._id)) {
        return res
          .status(403)
          .json({ success: false, message: "تقدر تلغي أوردراتك بس" });
      }
      if (order.orderStatus !== "Pending") {
        return res.status(403).json({
          success: false,
          message: "تقدر تلغي الأوردر وهو قيد الانتظار فقط",
        });
      }
    }

    // السيلز يلغي الأوردرات اللي حجزها هو بس
    if (
      status === "Cancelled" &&
      role === "sales" &&
      !order.bookedBy?.user?.equals(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "تقدر تلغي الأوردرات اللي حجزتها بس",
      });
    }

    const update = {
      $set: { orderStatus: status },
      $push: {
        statusHistory: {
          status,
          changedBy: req.user._id,
          changedAt: new Date(),
          ...(note ? { note: String(note).trim() } : {}),
        },
      },
    };

    // 4) الشحن: لازم بيانات شركة أو مندوب
    if (status === "Shipped") {
      const result = buildShipping(shipping, req.user._id);
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      update.$set.shipping = result.value;
    }

    // الشرط على الحالة الحالية يمنع طلبين متزامنين من تغيير الحالة مرتين
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: order.orderStatus },
      update,
      { new: true },
    );
    if (!updated) {
      return res.status(409).json({
        success: false,
        message: "حالة الأوردر اتغيرت، حدّث الصفحة وجرب تاني",
      });
    }

    // الإلغاء أو رفض الاستلام: البضاعة ترجع للمخزون
    if (status === "Cancelled" || status === "Refused") {
      await restoreStock(order.items);
    }

    res.json({
      success: true,
      message: `تم تغيير الحالة إلى ${status}`,
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------------------------------------------------
// POST /api/orders/:id/notes   (ملاحظات المخزن / متابعة المبيعات)
// body: { text: "العميل مش بيرد" }
// بتتسجل في statusHistory من غير ما الحالة تتغير
// السيلز بيضيف ملاحظات على اللي حجزه بس
// ---------------------------------------------------------
exports.addOrderNote = async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();
    if (!text) {
      return res
        .status(400)
        .json({ success: false, message: "نص الملاحظة مطلوب" });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "معرّف الأوردر غير صالح" });
    }

    const order = await Order.findOne({ _id: req.params.id, isDeleted: false });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "الأوردر غير موجود" });
    }

    if (
      req.user.role === "sales" &&
      !order.bookedBy?.user?.equals(req.user._id)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "غير مسموح لك بهذا الأوردر" });
    }

    const updated = await Order.findOneAndUpdate(
      { _id: order._id },
      {
        $push: {
          statusHistory: {
            status: order.orderStatus,
            note: text,
            changedBy: req.user._id,
            changedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    res.json({ success: true, message: "تم إضافة الملاحظة", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------------------------------------------------
// PATCH /api/orders/:id/payment   (محاسب / مدير مبيعات / أدمن - الصلاحية في الـ route)
// بيأكد إن الأوردر اتدفع (isPaid) من غير ما يغيّر حالته
// ---------------------------------------------------------
exports.markOrderPaid = async (req, res) => {
  try {
    // id غلط الشكل كان بيرجع 500
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "معرّف الأوردر غير صالح" });
    }

    const order = await Order.findOne({ _id: req.params.id, isDeleted: false });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "الأوردر غير موجود" });

    if (order.isPaid) {
      return res
        .status(400)
        .json({ success: false, message: "الأوردر مدفوع بالفعل" });
    }
    if (["Cancelled", "Refused"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `مينفعش تأكد دفع أوردر حالته ${order.orderStatus}`,
      });
    }

    const updated = await Order.findOneAndUpdate(
      { _id: order._id, isPaid: false },
      {
        $set: { isPaid: true, paidAt: new Date(), paidBy: req.user._id },
        $push: {
          statusHistory: {
            status: order.orderStatus,
            note: "Payment confirmed",
            changedBy: req.user._id,
            changedAt: new Date(),
          },
        },
      },
      { new: true },
    );
    if (!updated) {
      return res.status(409).json({
        success: false,
        message: "الأوردر اتحدّث، حدّث الصفحة وجرب تاني",
      });
    }

    res.json({ success: true, message: "تم تأكيد الدفع", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};