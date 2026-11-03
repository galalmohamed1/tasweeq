const mongoose = require("mongoose");

const TreasuryTransactionSchema = new mongoose.Schema(
  {
    // in = فلوس دخلت الخزنة، out = فلوس خرجت
    type: { type: String, enum: ["in", "out"], required: true },

    category: {
      type: String,
      enum: [
        "sales_collection", // تحصيل مبيعات
        "advance", // سلفة لموظف
        "expense", // مصروفات
        "supplier", // دفعة مورد
        "salary", // مرتبات
        "other",
      ],
      required: true,
    },

    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, trim: true, default: "" },

    // الموظف (إجباري في حالة السلفة)
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },

    date: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

TreasuryTransactionSchema.index({ isDeleted: 1, date: 1 });
TreasuryTransactionSchema.index({ category: 1, employee: 1, date: 1 });

module.exports = mongoose.model(
  "TreasuryTransaction",
  TreasuryTransactionSchema,
);