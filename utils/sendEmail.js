const nodemailer = require("nodemailer");

const sendEmail = async ({ email, subject, html }) => {

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.verify();

    console.log("Email transporter is ready");

    await transporter.sendMail({
        from: `"E-Commerce Store" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html
    });

    console.log("Email sent successfully");
};

module.exports = sendEmail;