const express = require("express");
const router = express.Router();

const { createContactMessage, deleteContactMessage, getAllContactMessages, getContactMessageById, markAsRead } = require('../controllers/contact.controller')
const { protect } = require('../middlewares/auth')
const { authorizeRoles } = require("../middlewares/authorizeRoles");

router.post("/", createContactMessage);

router.get("/", protect, authorizeRoles("admin", "salesManager"), getAllContactMessages);
router.get("/:id", protect, authorizeRoles("admin", "salesManager"), getContactMessageById);
router.put("/:id/read", protect, authorizeRoles("admin", "salesManager"), markAsRead);
router.delete("/:id", protect, authorizeRoles("admin", "salesManager"), deleteContactMessage);

module.exports = router;