const mongoose = require("mongoose");

const FAQSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: true,
            trim: true
        },

        answer: {
            type: String,
            required: true,
            trim: true
        },

        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("FAQ", FAQSchema);