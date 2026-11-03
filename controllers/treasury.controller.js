const Treasury = require("../models/TreasuryTransaction");
const User = require("../models/user.model");
const asyncHandler = require("../middlewares/asyncHandler");
const { getRange } = require("../utils/reportRange");

const TYPES = ["in", "out"];
const CATEGORIES = [
  "sales_collection",
  "advance",
  "expense",
  "supplier",
  "salary",
  "other",
];

// POST /api/treasury
exports.createTransaction = asyncHandler(async (req, res) => {
  const { type, category, amount, note, employee, order, date } = req.body;

  if (!TYPES.includes(type)) {
    return res.status(400).json({ success: false, message: "type لازم يكون in أو out" });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: "category غير صالح" });
  }
  if (!(Number(amount) > 0)) {
    return res.status(400).json({ success: false, message: "المبلغ لازم يكون أكبر من صفر" });
  }

  // السلفة دايماً فلوس خارجة ولازم تتسجل على موظف
  if (category === "advance") {
    if (type !== "out") {
      return res.status(400).json({ success: false, message: "السلفة لازم تكون صادر (out)" });
    }
    const emp = await User.findOne({ _id: employee, isDeleted: { $ne: true } });
    if (!emp) {
      return res.status(400).json({ success: false, message: "الموظف مطلوب للسلفة" });
    }
  }

  const tx = await Treasury.create({
    type,
    category,
    amount: Number(amount),
    note,
    employee: employee || undefined,
    order: order || undefined,
    date: date ? new Date(date) : undefined,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: tx });
});

// GET /api/treasury?period=daily&date=2026-11-03
exports.getTransactions = asyncHandler(async (req, res) => {
  const range = getRange(req.query);
  if (range.error) {
    return res.status(400).json({ success: false, message: range.error });
  }

  const transactions = await Treasury.find({
    isDeleted: false,
    date: { $gte: range.start, $lt: range.end },
  })
    .populate("employee", "name")
    .populate("createdBy", "name")
    .sort("date");

  res.json({ success: true, data: { period: range.label, transactions } });
});

// DELETE /api/treasury/:id  (حذف ناعم، للأدمن بس)
exports.deleteTransaction = asyncHandler(async (req, res) => {
  const tx = await Treasury.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );
  if (!tx) {
    return res.status(404).json({ success: false, message: "الحركة غير موجودة" });
  }
  res.json({ success: true, message: "تم الحذف" });
});