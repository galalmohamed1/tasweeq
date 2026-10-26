const mongoose = require("mongoose");
const imageSchema = require("./schemas/image.schema");

const categorySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },

    slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },

    image: {
        type: imageSchema,
        required: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

categorySchema.index({ title: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
categorySchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

module.exports = mongoose.model("Category", categorySchema);