type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: string;
};

export class EmailConfigurationError extends Error {
  constructor() {
    super("Email provider is not configured");
    this.name = "EmailConfigurationError";
  }
}

interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    console.info({
      to: message.to,
      subject: message.subject,
      category: message.category,
      delivered: false,
      provider: "console",
    }, "Email delivery suppressed in development");
  }
}

class ResendEmailProvider implements EmailProvider {
  private readonly apiKey = process.env["RESEND_API_KEY"];
  private readonly from = process.env["EMAIL_FROM"] || "SkillForge AI <noreply@skillforge.local>";

  async send(message: EmailMessage) {
    if (!this.apiKey) throw new EmailConfigurationError();
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Email provider failed with ${response.status}`);
  }
}

function getProvider(): EmailProvider {
  const provider = process.env["EMAIL_PROVIDER"] || "console";
  if (provider === "resend") return new ResendEmailProvider();
  return new ConsoleEmailProvider();
}

export const emailService = {
  async sendVerificationEmail(to: string, name: string, verificationUrl: string) {
    await getProvider().send({
      to,
      category: "email_verification",
      subject: "Verify your SkillForge AI account",
      text: `Hi ${name}, verify your SkillForge AI account using this link: ${verificationUrl}`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Verify your SkillForge AI account:</p><p><a href="${escapeHtml(verificationUrl)}">Verify account</a></p>`,
    });
  },
  async sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
    await getProvider().send({
      to,
      category: "password_reset",
      subject: "Reset your SkillForge AI password",
      text: `Hi ${name}, reset your password using this link: ${resetUrl}`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Reset your password:</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p>`,
    });
  },
  async sendNotification(to: string, subject: string, body: string, category = "notification") {
    await getProvider().send({
      to,
      category,
      subject,
      text: body,
      html: `<p>${escapeHtml(body)}</p>`,
    });
  },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
