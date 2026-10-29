const express = require("express");
const router = express.Router();

const {
  getShippingFee,
  setShippingFee,
} = require("../controllers/shippingFee.controller");
const { protect } = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

router.get("/", getShippingFee);
router.put(
  "/",
  protect,
  authorizeRoles("admin", "salesManager"),
  setShippingFee,
);

module.exports = router;
