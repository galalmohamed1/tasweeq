require("dotenv").config();
 
const express = require("express");
 
const connectDB = require("./config/db");
const router = require("./routes/index");
const corsMiddleware = require("./middlewares/cors.middlewares");
 
const app = express();
 
const PORT = process.env.PORT || 5000;
 
connectDB();
 
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
 
// Routes
app.use("/api", router);
 
// Global Error Handler
app.use((err, req, res, next) => {
    res.status(err.status || 400).json({ success: false, message: err.message });
});
 
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});