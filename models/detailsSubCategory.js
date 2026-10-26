const mongoose = require("mongoose");

const DetailsSubCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

DetailsSubCategorySchema.index(
  { subcategory: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

DetailsSubCategorySchema.index(
  { subcategory: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model(
  "DetailsSubCategory",
  DetailsSubCategorySchema,
);