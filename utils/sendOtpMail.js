const nodemailer = require("nodemailer");

const sendOtpMail = async (toEmail, otp, subject = "Your OTP Code - Verify Your Email") => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let title = "Email Verification";
    let message = "Use the OTP below to verify your email address";
    
    if (subject.includes("Password")) {
      title = "Password Reset Request";
      message = "Use the OTP below to reset your password";
    }

    const mailOptions = {
      from: `"Ishop" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: `
      <div style="background:#f4f4f4; padding:30px 0; font-family:Arial, sans-serif;">
        <div style="max-width:500px; margin:auto; background:white; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
          
          <h2 style="color:#333;">🔐 ${title}</h2>
          
          <p style="color:#555; font-size:14px;">
            ${message}
          </p>

          <div style="margin:20px 0;">
            <span style="
              display:inline-block;
              font-size:28px;
              letter-spacing:6px;
              font-weight:bold;
              color:#01A49E;
              background:#f0fdfa;
              padding:12px 20px;
              border-radius:8px;
            ">
              ${otp}
            </span>
          </div>

          <p style="color:#777; font-size:13px;">
            This OTP is valid for <b>10 minutes</b>.
          </p>

          <hr style="margin:25px 0; border:none; border-top:1px solid #eee;" />

          <p style="font-size:12px; color:#aaa;">
            If you didn't request this, you can safely ignore this email.
          </p>

          <p style="margin-top:20px; font-size:12px; color:#aaa;">
            © ${new Date().getFullYear()} Ishop. All rights reserved.
          </p>

        </div>
      </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return "OTP Email sent successfully";

  } catch (error) {
    console.error(error);
    return "Email sending failed: " + error.message;
  }
};

module.exports = sendOtpMail;