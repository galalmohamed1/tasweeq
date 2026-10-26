const express = require('express');
const router = express.Router();
const {
    register,
    login,
    forgetPassword,
    resetPassword,
    verifyEmail,
    createaccountant,
    createwarehouse
} = require('../controllers/auth.controller');

const {protect} = require('../middlewares/auth');
const {isAdmin} = require('../middlewares/isAdmin');

router.post("/register", register);
router.post("/login", login);
router.post("/forgotPassword", forgetPassword);
router.post("/resetPassword/:token", resetPassword);
router.post("/verify-email", verifyEmail);

// أدمن بس
router.post("/accountant", protect, isAdmin, createaccountant);
router.post("/warehouse", protect, isAdmin, createwarehouse);

module.exports = router;
