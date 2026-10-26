const mongoose = require("mongoose");
const imageSchema = require("./schemas/image.schema");

const ProductSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 200
        },

        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        sizes: {
    type: [String],
    default: [],
    validate: {
        validator: (sizes) => sizes.every((size) => size.trim().length > 0),
        message: "Sizes must not contain empty values"
    }
        },

        colors: {
            type: [String],
            default: [],
            validate: {
                validator: (colors) => colors.every((color) => color.trim().length > 0),
                message: "Colors must not contain empty values"
            }
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        discountPrice: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: function (value) {
                    return value === 0 || value < this.price;
                },
                message: "Discount price must be less than price"
            }
        },

        stock: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },

        images: {
            type: [imageSchema],
            required: true,
            validate: {
                validator: (images) => images.length > 0,
                message: "Product must have at least one image"
            }
        },

        videos: {
            type: [String],
            default: []
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true
        },

        subCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubCategory",
            required: true
        },
        
        detailsSubCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DetailsSubCategory",
            required: false   // خليه true لو كل منتج لازم يبقى له details
        },

        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        numReviews: {
            type: Number,
            default: 0,
            min: 0
        },

        isFeatured: {
            type: Boolean,
            default: false
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

// slug فريد بين المنتجات غير المحذوفة فقط
ProductSchema.index(
    { slug: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } }
);

ProductSchema.index({ category: 1, subCategory: 1, isDeleted: 1, isActive: 1 });
ProductSchema.index({ isFeatured: 1, isActive: 1, isDeleted: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Product", ProductSchema);