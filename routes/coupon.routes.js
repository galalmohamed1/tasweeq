const express = require('express');
const router = express.Router();

const {
    createCoupon,
    getAllCoupons,
    getCouponById,
    applyCoupon,
    updateCoupon,
    deleteCoupon} = require("../controllers/coupon.controller");

const {protect}= require('../middlewares/auth');
const { authorizeRoles } = require("../middlewares/authorizeRoles");

router.post("/apply", protect, applyCoupon);
router.get("/",protect, authorizeRoles("admin", "salesManager"), getAllCoupons);
router.get("/:id", protect, authorizeRoles("admin", "salesManager"), getCouponById);
router.post("/", protect, authorizeRoles("admin", "salesManager"), createCoupon);
router.put("/:id", protect, authorizeRoles("admin", "salesManager"), updateCoupon);
router.delete("/:id", protect, authorizeRoles("admin", "salesManager"), deleteCoupon);

module.exports = router