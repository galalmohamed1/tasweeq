const express = require('express');
const router = express.Router();

const { getAllUsers, getProfile, getUserById, deleteUser,updatePassword,updateProfile } = require('../controllers/user.controller')
const { protect } = require('../middlewares/auth')
const { authorizeRoles } = require("../middlewares/authorizeRoles");

router.use(protect);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/update-password", updatePassword);

router.get("/", authorizeRoles("admin", "salesManager"), getAllUsers);
router.get("/:id", authorizeRoles("admin", "salesManager"), getUserById);
router.delete("/:id", authorizeRoles("admin", "salesManager"), deleteUser);

module.exports = router;