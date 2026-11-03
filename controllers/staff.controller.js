const User = require("../models/user.model");
const asyncHandler = require("../middlewares/asyncHandler");

const STAFF_ROLES = ["salesManager", "sales", "accountant", "warehouse", "courier"];

// GET /api/staff  (أدمن ومحاسب): الموظفين بمرتباتهم ونسب عمولتهم
exports.getStaff = asyncHandler(async (req, res) => {
  const staff = await User.find({
    isDeleted: { $ne: true },
    role: { $in: STAFF_ROLES },
  })
    .select("name email role +salary +commissionRate")
    .sort("name");

  res.json({ success: true, data: staff });
});

// PATCH /api/staff/:id/compensation  (أدمن بس): { salary, commissionRate }
exports.updateCompensation = asyncHandler(async (req, res) => {
  const { salary, commissionRate } = req.body;
  const update = {};

  if (salary !== undefined) {
    if (!(Number(salary) >= 0)) {
      return res.status(400).json({ success: false, message: "المرتب غير صالح" });
    }
    update.salary = Number(salary);
  }
  if (commissionRate !== undefined) {
    const rate = Number(commissionRate);
    if (!(rate >= 0 && rate <= 100)) {
      return res
        .status(400)
        .json({ success: false, message: "نسبة العمولة لازم تكون بين 0 و 100" });
    }
    update.commissionRate = rate;
  }
  if (!Object.keys(update).length) {
    return res.status(400).json({ success: false, message: "مفيش بيانات للتعديل" });
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true }, role: { $in: STAFF_ROLES } },
    update,
    { new: true, runValidators: true },
  ).select("name email role +salary +commissionRate");

  if (!user) {
    return res.status(404).json({ success: false, message: "الموظف غير موجود" });
  }
  res.json({ success: true, data: user });
});