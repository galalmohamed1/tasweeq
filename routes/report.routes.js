const express = require("express");
const { protect } = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorizeRoles");
const { getTreasuryReport, getSalesReport } = require("../controllers/report.controller");

const router = express.Router();

router.use(protect, authorizeRoles("admin", "accountant"));

router.get("/treasury", getTreasuryReport);
router.get("/sales", getSalesReport);

module.exports = router;