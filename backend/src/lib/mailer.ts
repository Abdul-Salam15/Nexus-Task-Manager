const { BREVO_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME } = process.env;

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!BREVO_API_KEY || !EMAIL_FROM_ADDRESS) {
    console.log(`[nexus] Email to ${to} | ${subject} | ${text}`);
    return;
  }

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 8000);

  let res: Response;
  try {
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: abort.signal,
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: EMAIL_FROM_NAME || 'Nexus', email: EMAIL_FROM_ADDRESS },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}

export async function sendOtpEmail(to: string, otp: string) {
  await sendEmail(
    to,
    'Your Nexus password reset code',
    `<p>Your password reset code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
    `Your password reset code is ${otp}. It expires in 5 minutes.`,
  );
}

export async function sendNotificationEmail(to: string, title: string, body: string) {
  await sendEmail(
    to,
    `Nexus: ${title}`,
    `<p><strong>${title}</strong></p><p>${body}</p>`,
    body,
  );
}
