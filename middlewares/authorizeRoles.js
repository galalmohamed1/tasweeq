const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "You are not allowed to perform this action"
        });
    }
    next();
};

module.exports = { authorizeRoles };
