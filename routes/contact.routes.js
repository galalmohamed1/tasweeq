const express = require("express");
const router = express.Router();

const { createContactMessage, deleteContactMessage, getAllContactMessages, getContactMessageById, markAsRead } = require('../controllers/contact.controller')
const { protect } = require('../middlewares/auth')
const { isAdmin } = require('../middlewares/isAdmin')

router.post("/", createContactMessage);

router.get("/", protect, isAdmin, getAllContactMessages);
router.get("/:id", protect, isAdmin, getContactMessageById);
router.put("/:id/read", protect, isAdmin, markAsRead);
router.delete("/:id", protect, isAdmin, deleteContactMessage);

module.exports = router;