require("dotenv").config();

const express = require("express");

const connectDB = require("./config/db");
// const router = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");
const corsMiddleware = require("./middlewares/cors.middlewares");

const app = express();

const PORT = process.env.PORT || 5000;

connectDB();

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.use("/api", router);

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});