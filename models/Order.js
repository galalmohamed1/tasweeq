const mongoose = require("mongoose");

const ORDER_STATUSES = [
  "pending",
  "preparing",
  "shipped",
  "delivered",
  "refused",
  "cancelled",
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

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    // صاحب الأوردر (فاضي لو الموظف حجز لعميل مش مسجّل)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    source: { type: String, enum: ["website", "sales"], default: "website" },

    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, trim: true },
    },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must have at least one item",
      },
    },

    totalPrice: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ORDER_STATUSES, default: "pending" },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },

    shipping: {
      company: { type: String, trim: true },
      courierName: { type: String, trim: true },
      shippedAt: { type: Date },
    },

    notes: [noteSchema],
    statusHistory: [historySchema],
  },
  { timestamps: true },
);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
