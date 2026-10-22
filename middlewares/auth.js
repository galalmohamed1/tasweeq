const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const asyncHandler = require("./asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        
        if (!req.user || req.user.isDeleted) {
            return res.status(401).json({ success: false, message: "User no longer exists" });
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
});

module.exports = { protect }; 