const express = require("express");
const router = express.Router();
 
const { getShippingFee, setShippingFee } = require("../controllers/shippingFee.controller");
const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/isAdmin");
 
router.get("/", getShippingFee);
router.put("/", protect, isAdmin, setShippingFee);
 
module.exports = router;