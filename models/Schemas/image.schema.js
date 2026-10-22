const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema(
    {
        public_id: {
            type: String,
            required: true
        },
        secure_url: {
            type: String,
            required: true
        }
    },
    {
        _id: false
    }
);

module.exports = ImageSchema;