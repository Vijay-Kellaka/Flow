import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

let transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

function normalizeAddress(entry: string | { address: string }): string {
  return (typeof entry === "string" ? entry : entry.address).toLowerCase();
}

function getTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
  const user = process.env.SMTP_USER?.trim().toLowerCase();
  const password = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");
  const configuredHost = process.env.SMTP_HOST?.trim();
  const isGmail = user?.endsWith("@gmail.com") && (!configuredHost || configuredHost === "smtp.gmail.com");

  if (!user || !password) {
    throw new Error("Email is not configured. Set SMTP_USER and SMTP_PASSWORD in .env.");
  }

  const common = {
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  };

  // Gmail's service preset handles the TLS/port combination for us and avoids
  // configuration mismatches between 465/SSL and 587/STARTTLS. It still uses
  // the sender account's App Password; the recipient can be any normal email.
  if (isGmail) {
    transporter = nodemailer.createTransport({ service: "gmail", ...common });
  } else {
    const host = configuredHost;
    if (!host) throw new Error("Email is not configured. Set SMTP_HOST for non-Gmail SMTP.");
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465;
    transporter = nodemailer.createTransport({ host, port, secure, ...common });
  }

  return transporter;
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  purpose: "account" | "journal",
) {
  const target = to.trim().toLowerCase();
  const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const path = purpose === "account" ? "/verify" : "/journal/recover";
  const link = `${base}${path}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(target)}`;
  const mailer = getTransporter();

  // Verify the SMTP connection before returning success. This prevents the UI from
  // reporting that an email was sent when Gmail/SMTP rejected the credentials.
  await mailer.verify();
  const sender = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "";
  if (!sender) throw new Error("SMTP_FROM or SMTP_USER is required.");
  const info = await mailer.sendMail({
    from: sender,
    to: target,
    envelope: { from: sender, to: target },
    replyTo: sender,
    subject: purpose === "account" ? "Verify your Flow account" : "Reset your Flow journal password",
    text: [
      "Flow",
      "",
      purpose === "account"
        ? "Verify your Flow account by opening this link:"
        : "Verify your email to reset your Flow journal password by opening this link:",
      link,
      "",
      "This link expires in 15 minutes.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#171717">
        <h2 style="margin:0 0 12px">Flow</h2>
        <p>${purpose === "account" ? "Verify your Flow account." : "Verify your email to reset your Flow journal password."}</p>
        <p><a href="${link}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111;color:#fff;text-decoration:none">${purpose === "account" ? "Verify account" : "Verify and reset journal password"}</a></p>
        <p style="font-size:13px;color:#666">This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>
        <p style="font-size:12px;color:#888;word-break:break-all">${link}</p>
      </div>
    `,
  });

  const accepted = (info.accepted ?? []).map(normalizeAddress);
  const rejected = (info.rejected ?? []).map(normalizeAddress);
  console.info("[mail] send result", { messageId: info.messageId, response: info.response, accepted, rejected });

  if (!accepted.includes(target)) {
    const reason = rejected.includes(target)
      ? `SMTP rejected recipient ${target}.`
      : "SMTP did not accept the recovery recipient.";
    throw new Error(reason);
  }
  return info;
}
