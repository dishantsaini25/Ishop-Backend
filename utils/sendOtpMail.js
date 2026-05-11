const { BrevoClient } = require('@getbrevo/brevo');

const sendOtpMail = async (toEmail, otp, subject = "Your OTP Code - Verify Your Email") => {
  try {
    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

    const isPasswordReset = subject.toLowerCase().includes("password");
    const title = isPasswordReset ? "Password Reset Request" : "Email Verification";
    const message = isPasswordReset
      ? "Use the OTP below to reset your password"
      : "Use the OTP below to verify your email address";

    const result = await client.transactionalEmails.sendTransacEmail({
      subject: subject,
      sender: { name: "iShop", email: "noreply@ishop.com" },
      to: [{ email: toEmail }],
      htmlContent: `
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
      </div>`
    });

    console.log('✓ OTP email sent via Brevo to:', toEmail, '| MessageId:', result?.body?.messageId || 'sent');
    return "OTP Email sent successfully";

  } catch (error) {
    const errMsg = error?.response?.body?.message || error?.message || 'Unknown error';
    console.error('✗ Brevo email error for', toEmail, ':', errMsg);
    return "Email sending failed: " + errMsg;
  }
};

module.exports = sendOtpMail;
