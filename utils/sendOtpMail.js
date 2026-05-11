const nodemailer = require("nodemailer");

const sendOtpMail = async (toEmail, otp, subject = "Your OTP Code - Verify Your Email") => {
  try {
    // Port 465 with SSL - works on most hosting providers including Render
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    let title = "Email Verification";
    let message = "Use the OTP below to verify your email address";

    if (subject.toLowerCase().includes("password")) {
      title = "Password Reset Request";
      message = "Use the OTP below to reset your password";
    }

    await transporter.sendMail({
      from: `"iShop" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: `
      <div style="background:#f4f4f4;padding:30px 0;font-family:Arial,sans-serif;">
        <div style="max-width:480px;margin:auto;background:white;border-radius:12px;padding:32px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <div style="width:60px;height:60px;background:#e6faf9;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <span style="font-size:28px;">🔐</span>
          </div>
          <h2 style="color:#1a1a1a;margin:0 0 8px;">${title}</h2>
          <p style="color:#666;font-size:14px;margin:0 0 24px;">${message}</p>
          <div style="background:#f0fdfa;border:2px dashed #01A49E;border-radius:10px;padding:20px;margin:0 0 24px;">
            <p style="color:#888;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your OTP</p>
            <p style="font-size:36px;font-weight:bold;color:#01A49E;letter-spacing:10px;margin:0;">${otp}</p>
          </div>
          <p style="color:#999;font-size:13px;margin:0 0 24px;">Valid for <strong>10 minutes</strong>. Do not share this with anyone.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;"/>
          <p style="font-size:12px;color:#bbb;margin:0;">If you didn't request this, ignore this email.</p>
          <p style="font-size:12px;color:#bbb;margin:8px 0 0;">© ${new Date().getFullYear()} iShop</p>
        </div>
      </div>
      `,
    });

    return "OTP Email sent successfully";

  } catch (error) {
    console.error("sendOtpMail error:", error.message);
    return "Email sending failed: " + error.message;
  }
};

module.exports = sendOtpMail;
