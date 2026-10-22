const cors = require("cors");

const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map(origin => origin.trim())
    : [];

const corsOptions = {
    origin: function (origin, callback) {

        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],

    credentials: true,

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With"
    ],

    exposedHeaders: [
        "Authorization",
        "X-Total-Count"
    ],

    maxAge: 86400,

    optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);