import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE } = process.env;

const transporter = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

export async function sendOtpEmail(to: string, otp: string) {
  if (!transporter) {
    console.log(`[nexus] Password reset code for ${to}: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject: 'Your Nexus password reset code',
    text: `Your password reset code is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your password reset code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  });
}

export async function sendNotificationEmail(to: string, title: string, body: string) {
  if (!transporter) {
    console.log(`[nexus] Notification for ${to}: ${title} - ${body}`);
    return;
  }

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject: `Nexus: ${title}`,
    text: body,
    html: `<p><strong>${title}</strong></p><p>${body}</p>`,
  });
}
