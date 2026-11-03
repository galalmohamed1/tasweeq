const express = require("express");
const { protect } = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorizeRoles");
const {
  createTransaction,
  getTransactions,
  deleteTransaction,
} = require("../controllers/treasury.controller");

const router = express.Router();

router.use(protect, authorizeRoles("admin", "accountant"));

router.route("/").post(createTransaction).get(getTransactions);
router.delete("/:id", authorizeRoles("admin"), deleteTransaction);

module.exports = router;