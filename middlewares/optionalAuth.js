const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// بيقرأ التوكن لو موجود ويحط المستخدم في req.user
// ومبيرفضش الطلب لو مفيش توكن أو التوكن غلط (بيكمّل كزائر عادي)
const optionalAuth = async (req, res, next) => {
    try {
        const header = req.headers.authorization;

        if (header && header.startsWith("Bearer")) {
            const token = header.split(" ")[1];

            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select("-password");

                if (user && !user.isDeleted) {
                    req.user = user;
                }
            }
        }
    } catch (_) {
        
    }

    next();
};

module.exports = { optionalAuth };