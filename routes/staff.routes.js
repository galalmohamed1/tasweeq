const express = require("express");
const { protect } = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorizeRoles");
const { getStaff, updateCompensation } = require("../controllers/staff.controller");

const router = express.Router();

router.use(protect);

router.get("/", authorizeRoles("admin", "accountant"), getStaff);
router.patch("/:id/compensation", authorizeRoles("admin"), updateCompensation);

module.exports = router;