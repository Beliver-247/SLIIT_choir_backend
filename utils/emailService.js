import nodemailer from 'nodemailer';

let transporter;

const ensureTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials are not configured. Please set SMTP_USER and SMTP_PASS.');
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

export const sendVerificationEmail = async ({ to, code, name }) => {
  const mailer = ensureTransporter();
  const subject = 'Verify your SLIIT Choir account';
  const text = `Hi ${name},\n\nUse the following One-Time Password (OTP) to verify your choir account: ${code}.\n\nThe code expires in 15 minutes. If you did not request this, please ignore this email.\n\nSLIIT Choir`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color:#1d4ed8;">SLIIT Choir Email Verification</h2>
      <p>Hi ${name},</p>
      <p>Use the OTP below to verify your choir member account. The code expires in 15 minutes.</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #111827;">${code}</p>
      <p>If you didn't attempt to register, you can ignore this email.</p>
      <p>— SLIIT Choir Team</p>
    </div>
  `;

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
};
