const express = require("express");
const router = express.Router();

const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  addOrderNote,
  markOrderPaid,
} = require("../controllers/order.controller");

const { protect } = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

router.post(
  "/",
  protect,
  authorizeRoles("user", "sales", "salesManager", "admin"),
  createOrder,
);
router.get("/my", protect, getMyOrders);// لازم قبل /:id
router.get(
  "/",
  protect,
  authorizeRoles(
    "admin",
    "salesManager",
    "accountant",
    "warehouse",
    "sales",
    "courier",
  ),
  getAllOrders,
);
router.get("/:id", protect, getOrderById);

// اليوزر لازم يكون مسموح له هنا عشان الإلغاء، والـ controller بيفرّق بين الأدوار
router.patch(
  "/:id/status",
  protect,
  authorizeRoles(
    "user",
    "sales",
    "salesManager",
    "admin",
    "warehouse",
    "accountant",
    "courier",
  ),
  updateOrderStatus,
);
router.post(
  "/:id/notes",
  protect,
  authorizeRoles("sales", "salesManager", "admin", "warehouse", "accountant"),
  addOrderNote,
);
router.patch(
  "/:id/payment",
  protect,
  authorizeRoles("accountant", "salesManager", "admin"),
  markOrderPaid,
);

module.exports = router;