const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    if (err.name === "CastError") {
        message = `Resource not found. Invalid: ${err.path}`;
        statusCode = 404;
    }

    if (err.code === 11000) {
        message = `Duplicate field value entered: ${Object.keys(err.keyValue)}`;
        statusCode = 400;
    }

    if (err.name === "ValidationError") {
        message = Object.values(err.errors).map(val => val.message).join(", ");
        statusCode = 400;
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack
    });
};

module.exports = errorHandler;