// Transactional email.
//
// Delivery is optional in the same spirit as Stripe: without credentials the
// app keeps working and simply reports that it could not send, so nothing
// silently pretends an email went out. Configure RESEND_API_KEY and
// EMAIL_FROM to turn it on (see .env.example).
//
// Resend is used because it is a single HTTPS call with no SDK, which suits
// a serverless function; swapping providers means changing only `send()`.

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text — deliberately no HTML, so nothing can be spoofed visually. */
  text: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { sent: false, error: "Email delivery is not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!res.ok) {
      // The provider's response can contain the recipient address, so only
      // the status is logged.
      console.error(`Email delivery failed with status ${res.status}`);
      return { sent: false, error: "Email delivery failed" };
    }
    return { sent: true };
  } catch (error) {
    console.error("Email delivery error:", error instanceof Error ? error.message : "unknown");
    return { sent: false, error: "Email delivery failed" };
  }
}

export function passwordResetEmail(resetUrl: string, expiresInMinutes: number): Omit<EmailMessage, "to"> {
  return {
    subject: "Reset your NEST password",
    text: [
      "Hi,",
      "",
      "You asked to reset your NEST password. Open this link to choose a new one:",
      resetUrl,
      "",
      `The link works once and expires in ${expiresInMinutes} minutes.`,
      "",
      "If you didn't ask for this, you can ignore this email — your password stays as it is.",
      "",
      "NEST Madrid",
    ].join("\n"),
  };
}
