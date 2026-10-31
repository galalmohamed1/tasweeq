const nodemailer = require("nodemailer");

// بنعمل الـ transporter مرة واحدة بدل ما نعمله مع كل إيميل
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async ({ email, subject, html }) => {
    await transporter.sendMail({
        from: `"Horus Market" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html
    });
};

module.exports = sendEmail;