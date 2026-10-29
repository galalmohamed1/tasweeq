const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/user.model");

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const existingAdmin = await User.findOne({
            email: "gm3308769@gmail.com"
        });

        if (existingAdmin) {
            console.log("Admin already exists");
            process.exit();
        }

        await User.create({
            name: "Galal Mohammed",
            email: "gm3308769@gmail.com",
            phoneNumber: "01121113152",
            password: "Galal162002",
            role: "admin",
            isVerified: true
        });

        console.log("Admin created successfully");

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

createAdmin();