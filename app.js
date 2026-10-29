require("dotenv").config();

const express = require("express");

const connectDB = require("./config/db");
const router = require("./routes/index");
const corsMiddleware = require("./middlewares/cors.middlewares");

const app = express();

const PORT = process.env.PORT || 5000;

// الاتصال بالداتابيز: بنحفظ الـ promise عشان ما نعيدش الاتصال مع كل request
let dbPromise = null;

app.use(async (req, res, next) => {
    try {
        if (!dbPromise) {
            dbPromise = connectDB();
        }
        await dbPromise;
        next();
    } catch (err) {
        dbPromise = null; // يحاول تاني في الـ request الجاي
        next(err);
    }
});

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تنبيه: الـ filesystem في Vercel read-only، فالملفات المرفوعة مش هتتحفظ.
// استخدم Cloudinary / S3 / Vercel Blob للرفع بدل السطر ده في الـ production.
if (process.env.NODE_ENV !== "production") {
    app.use("/uploads", express.static("uploads"));
}

// Routes
app.use("/api", router);

// Global Error Handler
app.use((err, req, res, next) => {
    res.status(err.status || 400).json({ success: false, message: err.message });
});

// تشغيل السيرفر محليًا بس. على Vercel بنصدّر الـ app بدل listen
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;