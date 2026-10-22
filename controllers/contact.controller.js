const asyncHandler = require("../middlewares/asyncHandler");

const Contact = require("../models/Contact");


// ==================== Create Contact Message ====================

const createContactMessage = asyncHandler(async (req, res) => {

    const {
        name,
        email,
        phoneNumber,
        subject,
        message
    } = req.body;

    if (!name || !email || !phoneNumber || !subject || !message) {
        return res.status(400).json({
            success: false,
            message: "Name, email, phoneNumber, subject and message are required"
        });
    }

    const contactMessage = await Contact.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        subject: subject.trim(),
        message: message.trim()
    });

    return res.status(201).json({
        success: true,
        message: "Your message has been sent successfully",
        data: contactMessage
    });
});


// ==================== Get All Contact Messages ====================

const getAllContactMessages = asyncHandler(async (req, res) => {

    const messages = await Contact.find()
        .sort({ isRead: 1, createdAt: -1 });

    return res.status(200).json({
        success: true,
        count: messages.length,
        data: messages
    });
});


// ==================== Get Contact Message By ID ====================

const getContactMessageById = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const contactMessage = await Contact.findById(id);

    if (!contactMessage) {
        return res.status(404).json({
            success: false,
            message: "Contact message not found"
        });
    }

    return res.status(200).json({
        success: true,
        data: contactMessage
    });
});


// ==================== Mark As Read ====================

const markAsRead = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const contactMessage = await Contact.findById(id);

    if (!contactMessage) {
        return res.status(404).json({
            success: false,
            message: "Contact message not found"
        });
    }

    contactMessage.isRead = true;

    await contactMessage.save();

    return res.status(200).json({
        success: true,
        message: "Contact message marked as read",
        data: contactMessage
    });
});


// ==================== Delete Contact Message ====================

const deleteContactMessage = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const contactMessage = await Contact.findById(id);

    if (!contactMessage) {
        return res.status(404).json({
            success: false,
            message: "Contact message not found"
        });
    }

    await contactMessage.deleteOne();

    return res.status(200).json({
        success: true,
        message: "Contact message deleted successfully",
        data: null
    });
});


module.exports = {
    createContactMessage,
    getAllContactMessages,
    getContactMessageById,
    markAsRead,
    deleteContactMessage
};