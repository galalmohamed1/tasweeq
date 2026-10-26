const express = require('express');
const router = express.Router();

const { getAllUsers, getProfile, getUserById, deleteUser,updatePassword,updateProfile } = require('../controllers/user.controller')
const { protect } = require('../middlewares/auth')
const { isAdmin } = require('../middlewares/isAdmin')

router.use(protect);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/update-password", updatePassword);

router.get("/", isAdmin, getAllUsers);
router.get("/:id", isAdmin, getUserById);
router.delete("/:id", isAdmin, deleteUser);

module.exports = router;