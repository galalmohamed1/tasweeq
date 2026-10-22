const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema({
    name:{
        type:String,
        require: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email:{
        type:String,
        trim:true,
        require: true,
        lowercase: true,
        minlength: 10,
        maxlength: 80
    },
    phoneNumber:{
        type:String,
        trim: true,
        require: true,
        minlength: 10,
        maxlength: 18
    },
    subject: {
        type: String,
        require: true,
        trim: true,
        minlength: 2,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 200
    },

    isRead: {
        type: Boolean,
        default: false
    }
    },
    {
        timestamps: true
    }
)

module.exports = mongoose.model("Contact", ContactSchema);