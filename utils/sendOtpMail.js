const nodemailer = require("nodemailer");

// Try Resend first (works on Render), fallback to Gmail SMTP
const sendViaResend = async (toEmail, subject, html) => {
  if (!process.env.RESEND_API_KEY) return null; // skip if not configured

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: toEmail,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend error:', error);
      return null;
    }

    console.log('✓ Email sent via Resend:', data?.id);
    return 'sent';
  } catch (e) {
    console.error('Resend exception:', e.message);
    return null;
  }
};

const sendViaGmail = async (toEmail, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"iShop" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: html,
    });

    console.log('✓ Email sent via Gmail to:', toEmail);
    return 'sent';
  } catch (e) {
    console.error('Gmail error:', e.message);
    return null;
  }
};

const getEmailHtml = (otp, subject) => {
  const isPasswordReset = subject.toLowerCase().includes("password");
  const title = isPasswordReset ? "Password Reset Request" : "Email Verification";
  const message = isPasswordReset
    ? "Use the OTP below to reset your password"
    : "Use the OTP below to verify your email address";

  return `
  <div style="background:#f4f4f4;padding:30px 0;font-family:Arial,sans-serif;">
    <div style="max-width:480px;margin:auto;background:white;border-radius:12px;padding:32px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      <h2 style="color:#1a1a1a;margin:0 0 8px;">🔐 ${title}</h2>
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
  </div>`;
};

const sendOtpMail = async (toEmail, otp, subject = "Your OTP Code - Verify Your Email") => {
  const html = getEmailHtml(otp, subject);

  // Try Resend first (reliable on cloud hosting)
  const resendResult = await sendViaResend(toEmail, subject, html);
  if (resendResult) return "OTP Email sent successfully";

  // Fallback to Gmail
  const gmailResult = await sendViaGmail(toEmail, subject, html);
  if (gmailResult) return "OTP Email sent successfully";

  return "Email sending failed: Both Resend and Gmail failed";
};

module.exports = sendOtpMail;
