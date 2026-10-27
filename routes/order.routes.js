const express = require("express");
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
} = require("../controllers/order.controller");

const { protect } = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

// // أي يوزر مسجل دخول
router.post("/", protect, createOrder);
router.get("/my-orders", protect, getMyOrders);
// لازم بعد /my عشان "my" ميتفهمش كـ id
router.get("/:id", protect, getOrderById); // الصلاحية بتتفحص جوه الـ controller

// الموظفين فقط
router.get("/", protect, authorizeRoles("admin", "accountant", "warehouse"), getAllOrders);


// الصلاحية حسب الحالة بتتفحص جوه الـ controller (user / accountant / warehouse / admin)
router.patch("/:id/status", protect, updateOrderStatus);

module.exports = router;
