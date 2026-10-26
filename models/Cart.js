const mongoose = require("mongoose");
 
const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
 
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
 
    // السعر وقت الإضافة (بعد الخصم لو موجود)
    price: {
        type: Number,
        required: true,
        min: 0
    },
 
    subTotal: {
        type: Number,
        required: true,
        min: 0
    },
 
    size: {
        type: String,
        trim: true,
        default: null
    },
 
    color: {
        type: String,
        trim: true,
        default: null
    }
});
 
const cartSchema = new mongoose.Schema(
    {
        // كل مستخدم له cart واحدة بس
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
 
        items: {
            type: [cartItemSchema],
            default: []
        },
 
        totalPrice: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);
 
module.exports = mongoose.model("Cart", cartSchema);