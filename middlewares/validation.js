const { validationResult } = require("express-validator");

const validationMiddleware = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const message = errors.array().map(err => err.msg).join(", ");
        
        return res.status(400).json({
            success: false,
            message
        });
    }
    next();
};

module.exports = validationMiddleware;