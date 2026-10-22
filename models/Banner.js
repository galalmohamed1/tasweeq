const mongoose = require('mongoose')

const BannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            required: true
        },
        link: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true
    }
)

module.exports = mongoose.model("Banner", BannerSchema);