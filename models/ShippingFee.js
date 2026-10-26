const mongoose = require("mongoose");
 
const ShippingFeeSchema = new mongoose.Schema(
    {
        // document واحد بس في الـ collection (الأدمن بيعدّل عليه)
        key: { type: String, default: "main", unique: true },
 
        shippingFee: {
            type: String,
            trim: true,
            required: true,
            default: "0",
            validate: {
                // بما إنها String، نتأكد إنها رقم صالح ("50" أو "49.5")
                validator: (v) => /^\d+(\.\d+)?$/.test(v),
                message: "shippingFee must be a valid number"
            }
        },
 
        updatedBy: { 
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);
 
module.exports = mongoose.model("ShippingFee", ShippingFeeSchema);