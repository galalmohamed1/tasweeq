const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        title: { type: String, required: true },
        image: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        size: { type: String, trim: true },
        color: { type: String, trim: true }
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema(
    {
        orderNumber: { type: String, unique: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        items: {
            type: [OrderItemSchema],
            validate: {
                validator: (v) => v.length > 0,
                message: "Order must have at least one item"
            }
        },
        shippingAddress: {
            fullName:    { type: String, required: true, trim: true },
            phoneNumber: { type: String, required: true, trim: true },
            country:     { type: String, required: true, default: "Egypt" },
            governorate: { type: String, required: true },
            city:        { type: String, required: true },
            area:        { type: String },
            street:      { type: String, required: true },
            building:    { type: String },
            apartment:   { type: String },
            postalCode:  { type: String },
            notes:       { type: String }
        },
        paymentMethod: {
            type: String,
            enum: ["CashOnDelivery", "CreditCard"],
            default: "CashOnDelivery"
        },
        isPaid: { type: Boolean, default: false },
        paidAt: { type: Date },
        totalPrice: { type: Number, required: true, min: 0 },
        shippingFee: { type: Number, default: 0, min: 0 },
        discountAmount: { type: Number, default: 0, min: 0 },
        couponCode: { type: String, trim: true, uppercase: true },
        finalPrice: { type: Number, required: true, min: 0 },
        orderStatus: {
            type: String,
            enum: ["Pending", "Paid", "Preparing", "Shipped", "Delivered", "Cancelled"],
            default: "Pending"
        },
        statusHistory: [
            {
                status: String,
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                changedAt: { type: Date, default: Date.now },
                _id: false
            }
        ],
        isDeleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);