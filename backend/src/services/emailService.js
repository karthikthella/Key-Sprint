import nodemailer from 'nodemailer';

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log('📧 SMTP Email Transporter configured successfully');
} else {
  console.log('ℹ️  SMTP not configured. OTP codes will be logged to the server console for dev testing.');
}

/**
 * Sends a 6-digit FIA Superlicence verification OTP to the driver's email.
 * @param {string} email - Destination email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} username - Driver callsign / name
 */
export async function sendOtpEmail(email, otp, username = 'Driver') {
  console.log(`\n==============================================`);
  console.log(`🏁 FIA PIT WALL TELEMETRY VERIFICATION CODE`);
  console.log(`📍 Driver Callsign: ${username}`);
  console.log(`📧 Destination:     ${email}`);
  console.log(`🔑 Verification OTP: >>> ${otp} <<< (Valid for 10 min)`);
  console.log(`==============================================\n`);

  if (!transporter) {
    return { sent: true, devMode: true };
  }

  const htmlContent = `
    <div style="background-color: #08080c; color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border-radius: 12px; border: 1px solid #28293d;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="background-color: #e10600; color: #ffffff; font-size: 16px; font-weight: 900; padding: 6px 14px; border-radius: 4px; letter-spacing: 2px;">FIA</span>
        <h2 style="color: #ffffff; font-size: 22px; margin-top: 14px; letter-spacing: 1px;">KEY-SPRINT SUPERLICENCE</h2>
        <p style="color: #a0a0b0; font-size: 13px;">Official Driver Induction Verification</p>
      </div>

      <div style="background-color: #12131e; border: 1px solid #202234; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <p style="color: #d0d0d8; font-size: 14px; margin-bottom: 8px;">Hello <strong>${username}</strong>,</p>
        <p style="color: #888898; font-size: 12px; margin-bottom: 18px;">Your 6-digit FIA telemetry access PIN for your new racing superlicence is:</p>
        
        <div style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #00d2be; background-color: #0c0d15; padding: 14px 20px; border-radius: 8px; display: inline-block; border: 1px dashed #00d2be;">
          ${otp}
        </div>

        <p style="color: #707080; font-size: 11px; margin-top: 14px;">This telemetry PIN expires in 10 minutes. If you did not request this, ignore this email.</p>
      </div>

      <div style="text-align: center; border-top: 1px solid #1c1d2c; padding-top: 14px;">
        <p style="color: #555566; font-size: 11px;">Formula 1 Esports Superlicence Authority • Key-Sprint 2026</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"FIA Key-Sprint Pit Wall" <no-reply@keysprint.f1>',
      to: email,
      subject: `[${otp}] Your FIA Superlicence Verification Code 🏎️`,
      html: htmlContent
    });
    return { sent: true, devMode: false };
  } catch (err) {
    console.error('Failed to send SMTP email:', err.message);
    return { sent: false, error: err.message, devMode: true };
  }
}
