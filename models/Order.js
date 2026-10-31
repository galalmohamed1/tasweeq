const mongoose = require("mongoose");

const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Shipped",
  "Delivered",
  "Refused",
  "Cancelled",
];

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: { type: String, required: true }, // نسخة وقت الحجز
    image: { type: String },
    price: { type: Number, required: true, min: 0 }, // السعر وقت الحجز
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String },
    color: { type: String },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "Egypt" },
    governorate: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    building: { type: String, trim: true },
    apartment: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false },
);

// سجل الحالات + الملاحظات (الملاحظة بتتسجل بنفس حالة الأوردر الحالية)
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },

    // صاحب الأوردر (فاضي لو الموظف حجز من غير عميل مسجّل)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // اللي حجز الأوردر (سيلز / مدير مبيعات)
    bookedBy: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String },
      role: { type: String },
    },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must have at least one item",
      },
    },

    shippingAddress: { type: shippingAddressSchema, required: true },

    paymentMethod: {
      type: String,
      enum: ["CashOnDelivery", "CreditCard"],
      required: true,
    },

    totalPrice: { type: Number, required: true, min: 0 }, // مجموع المنتجات
    shippingFee: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    finalPrice: { type: Number, required: true, min: 0 },

    orderStatus: { type: String, enum: ORDER_STATUSES, default: "Pending" },
    statusHistory: [statusHistorySchema],

    shipping: {
      method: { type: String, enum: ["Company", "Courier"] },
      companyName: { type: String, trim: true },
      courierName: { type: String, trim: true },
      courierPhone: { type: String, trim: true },
      trackingNumber: { type: String, trim: true },
      shippedAt: { type: Date },
      shippedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ "bookedBy.user": 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);