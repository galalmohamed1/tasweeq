const ExcelJS = require("exceljs");
const Order = require("../models/Order");
const Treasury = require("../models/TreasuryTransaction");
const User = require("../models/user.model");
const asyncHandler = require("../middlewares/asyncHandler");
const { getRange, fmt } = require("../utils/reportRange");

const SALES_ROLES = ["sales", "salesManager"];
const DEFAULT_COMMISSION_RATE = Number(process.env.DEFAULT_COMMISSION_RATE || 0); // %

const CATEGORY_LABELS = {
  sales_collection: "تحصيل مبيعات",
  advance: "سلفة",
  expense: "مصروفات",
  supplier: "دفعة مورد",
  salary: "مرتبات",
  other: "أخرى",
};
const TYPE_LABELS = { in: "وارد", out: "صادر" };

const round2 = (n) => Math.round((n || 0) * 100) / 100;

// ================= الخزنة =================
const buildTreasuryReport = async ({ start, end }) => {
  const match = { isDeleted: false, date: { $gte: start, $lt: end } };

  const [totals, byCategory, transactions] = await Promise.all([
    Treasury.aggregate([
      { $match: match },
      { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Treasury.aggregate([
      { $match: match },
      {
        $group: {
          _id: { type: "$type", category: "$category" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Treasury.find(match)
      .populate("employee", "name")
      .populate("createdBy", "name")
      .sort("date")
      .lean(),
  ]);

  const totalIn = totals.find((t) => t._id === "in")?.total || 0;
  const totalOut = totals.find((t) => t._id === "out")?.total || 0;

  // السلف لكل موظف
  const advancesMap = {};
  transactions
    .filter((t) => t.category === "advance")
    .forEach((t) => {
      const key = String(t.employee?._id || "unknown");
      advancesMap[key] = advancesMap[key] || {
        employee: t.employee?.name || "غير معروف",
        total: 0,
        count: 0,
      };
      advancesMap[key].total += t.amount;
      advancesMap[key].count += 1;
    });

  return {
    summary: {
      totalIn: round2(totalIn),
      totalOut: round2(totalOut),
      net: round2(totalIn - totalOut),
    },
    byCategory: byCategory.map((c) => ({
      type: c._id.type,
      category: c._id.category,
      label: CATEGORY_LABELS[c._id.category],
      total: round2(c.total),
      count: c.count,
    })),
    advances: Object.values(advancesMap).map((a) => ({ ...a, total: round2(a.total) })),
    transactions,
  };
};

// ================= المبيعات =================
// أساس العمولة: مجموع المنتجات - الخصم (من غير مصاريف الشحن)
const NET_SALE = {
  $subtract: ["$totalPrice", { $ifNull: ["$discountAmount", 0] }],
};

const buildSalesReport = async ({ start, end, period }) => {
  const isStatus = (s) => ({ $cond: [{ $eq: ["$orderStatus", s] }, 1, 0] });

  const [booked, delivered, overall, advances, staff] = await Promise.all([
    // الأوردرات اللي اتحجزت في الفترة
    Order.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: start, $lt: end },
          "bookedBy.user": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$bookedBy.user",
          ordersCount: { $sum: 1 },
          refusedCount: { $sum: isStatus("Refused") },
          cancelledCount: { $sum: isStatus("Cancelled") },
          totalBooked: { $sum: NET_SALE },
        },
      },
    ]),
    // الأوردرات المسلّمة والمدفوعة (isPaid) اللي استحقت عمولتها في الفترة
    Order.aggregate([
      {
        $match: {
          isDeleted: false,
          orderStatus: "Delivered",
          isPaid: true,
          "bookedBy.user": { $ne: null },
        },
      },
      {
        $addFields: {
          deliveredAt: {
            $ifNull: [
              {
                $max: {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ["$statusHistory", []] },
                        as: "h",
                        cond: { $eq: ["$$h.status", "Delivered"] },
                      },
                    },
                    as: "h",
                    in: "$$h.changedAt",
                  },
                },
              },
              "$updatedAt",
            ],
          },
        },
      },
      // العمولة بتستحق وقت ما الشرطين يتحققوا: التسليم والدفع (الأحدث فيهم)
      {
        $addFields: {
          commissionAt: {
            $max: ["$deliveredAt", { $ifNull: ["$paidAt", "$deliveredAt"] }],
          },
        },
      },
      { $match: { commissionAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: "$bookedBy.user",
          deliveredCount: { $sum: 1 },
          totalDelivered: { $sum: NET_SALE },
        },
      },
    ]),
    // ملخص كل الأوردرات بحسب الحالة
    Order.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
          total: { $sum: "$finalPrice" },
        },
      },
    ]),
    // السلف في الفترة
    Treasury.aggregate([
      {
        $match: {
          isDeleted: false,
          category: "advance",
          employee: { $ne: null },
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: "$employee", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    // كل موظفين المبيعات (علشان المرتب يظهر حتى لو معملوش أوردرات)
    User.find({ isDeleted: { $ne: true }, role: { $in: SALES_ROLES } })
      .select("name role +salary +commissionRate")
      .lean(),
  ]);

  const byId = (arr, id) => arr.find((x) => String(x._id) === String(id)) || {};
  const includeSalary = period === "monthly"; // المرتب بيدخل في الحساب في التقرير الشهري بس

  const rows = staff
    .map((u) => {
      const b = byId(booked, u._id);
      const d = byId(delivered, u._id);
      const adv = byId(advances, u._id);

      const rate = u.commissionRate ?? DEFAULT_COMMISSION_RATE;
      const salary = u.salary || 0;
      const commission = ((d.totalDelivered || 0) * rate) / 100;
      const advanceTotal = adv.total || 0;
      const salaryForPeriod = includeSalary ? salary : 0;

      return {
        salesId: u._id,
        name: u.name,
        role: u.role,
        ordersCount: b.ordersCount || 0,
        refusedCount: b.refusedCount || 0,
        cancelledCount: b.cancelledCount || 0,
        totalBooked: round2(b.totalBooked),
        deliveredCount: d.deliveredCount || 0,
        totalDelivered: round2(d.totalDelivered),
        salary,
        commissionRate: rate,
        commission: round2(commission),
        tookAdvance: advanceTotal > 0,
        advanceTotal: round2(advanceTotal),
        // المستحق = (المرتب في الشهري) + العمولة - السلف
        netDue: round2(salaryForPeriod + commission - advanceTotal),
      };
    })
    .sort((a, b) => b.totalDelivered - a.totalDelivered);

  const sum = (key) => round2(rows.reduce((s, r) => s + r[key], 0));

  return {
    salaryIncluded: includeSalary,
    overall: overall.map((o) => ({ status: o._id, count: o.count, total: round2(o.total) })),
    perSales: rows,
    totals: {
      totalDelivered: sum("totalDelivered"),
      salary: includeSalary ? sum("salary") : 0,
      commission: sum("commission"),
      advances: sum("advanceTotal"),
      netDue: sum("netDue"),
    },
  };
};

// ================= Excel =================
const styleHeader = (sheet) => {
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];
};

const sendWorkbook = async (res, wb, name) => {
  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${name}.xlsx"`);
  res.send(Buffer.from(buffer));
};

const treasuryWorkbook = (report, range) => {
  const wb = new ExcelJS.Workbook();

  const s1 = wb.addWorksheet("ملخص الخزنة");
  s1.columns = [
    { header: "البند", key: "k", width: 28 },
    { header: "القيمة", key: "v", width: 18 },
  ];
  s1.addRows([
    { k: "الفترة", v: range.label },
    { k: "إجمالي الوارد", v: report.summary.totalIn },
    { k: "إجمالي الصادر", v: report.summary.totalOut },
    { k: "الصافي", v: report.summary.net },
  ]);
  s1.addRow({});
  report.byCategory.forEach((c) =>
    s1.addRow({ k: `${TYPE_LABELS[c.type]} - ${c.label} (${c.count})`, v: c.total }),
  );
  styleHeader(s1);

  const s2 = wb.addWorksheet("الحركات");
  s2.columns = [
    { header: "التاريخ", key: "date", width: 20 },
    { header: "النوع", key: "type", width: 10 },
    { header: "البند", key: "category", width: 18 },
    { header: "المبلغ", key: "amount", width: 14 },
    { header: "الموظف", key: "employee", width: 20 },
    { header: "ملاحظة", key: "note", width: 30 },
    { header: "سجّلها", key: "by", width: 18 },
  ];
  report.transactions.forEach((t) =>
    s2.addRow({
      date: fmt(t.date),
      type: TYPE_LABELS[t.type],
      category: CATEGORY_LABELS[t.category],
      amount: t.amount,
      employee: t.employee?.name || "",
      note: t.note || "",
      by: t.createdBy?.name || "",
    }),
  );
  styleHeader(s2);

  return wb;
};

const salesWorkbook = (report, range) => {
  const wb = new ExcelJS.Workbook();
  const s = wb.addWorksheet("المبيعات");
  s.columns = [
    { header: "المندوب", key: "name", width: 22 },
    { header: "أوردرات محجوزة", key: "ordersCount", width: 14 },
    { header: "مرفوض", key: "refusedCount", width: 10 },
    { header: "ملغي", key: "cancelledCount", width: 10 },
    { header: "تم التسليم", key: "deliveredCount", width: 12 },
    { header: "مبيعات مسلّمة", key: "totalDelivered", width: 16 },
    { header: "المرتب", key: "salary", width: 12 },
    { header: "نسبة العمولة %", key: "commissionRate", width: 14 },
    { header: "العمولة", key: "commission", width: 12 },
    { header: "أخذ سلفة؟", key: "tookAdvance", width: 12 },
    { header: "السلف", key: "advanceTotal", width: 12 },
    {
      header: report.salaryIncluded
        ? "المستحق (مرتب + عمولة - سلف)"
        : "المستحق (عمولة - سلف)",
      key: "netDue",
      width: 26,
    },
  ];
  report.perSales.forEach((r) =>
    s.addRow({ ...r, tookAdvance: r.tookAdvance ? "نعم" : "لا" }),
  );
  s.addRow({});
  s.addRow({
    name: `الإجمالي (${range.label})`,
    totalDelivered: report.totals.totalDelivered,
    salary: report.totals.salary,
    commission: report.totals.commission,
    advanceTotal: report.totals.advances,
    netDue: report.totals.netDue,
  });
  styleHeader(s);
  return wb;
};

// ================= Controllers =================
// GET /api/reports/treasury?period=daily|weekly|monthly|custom&date=&from=&to=&format=xlsx
exports.getTreasuryReport = asyncHandler(async (req, res) => {
  const range = getRange(req.query);
  if (range.error) {
    return res.status(400).json({ success: false, message: range.error });
  }

  const report = await buildTreasuryReport(range);

  if (req.query.format === "xlsx") {
    return sendWorkbook(res, treasuryWorkbook(report, range), `treasury-${fmt(range.start)}`);
  }
  res.json({ success: true, data: { period: range.label, ...report } });
});

// GET /api/reports/sales?period=...&format=xlsx
exports.getSalesReport = asyncHandler(async (req, res) => {
  const range = getRange(req.query);
  if (range.error) {
    return res.status(400).json({ success: false, message: range.error });
  }

  const report = await buildSalesReport(range);

  if (req.query.format === "xlsx") {
    return sendWorkbook(res, salesWorkbook(report, range), `sales-${fmt(range.start)}`);
  }
  res.json({ success: true, data: { period: range.label, ...report } });
});