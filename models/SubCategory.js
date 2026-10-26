const mongoose = require('mongoose');

const SubCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },

    slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

SubCategorySchema.index(
    { category: 1, name: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } }
);

SubCategorySchema.index(
    { category: 1, slug: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model('SubCategory', SubCategorySchema);