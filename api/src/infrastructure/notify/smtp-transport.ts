import { createTransport, Transporter } from 'nodemailer';

export function createSmtpTransport(): Transporter {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return createTransport({
    host: process.env.SMTP_HOST ?? 'mailpit',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    ...(user && pass ? { auth: { user, pass }, requireTLS: true } : {}),
  });
}

export function mailReplyTo(): string | undefined {
  const replyTo = process.env.MAIL_REPLY_TO;
  if (replyTo) return replyTo;
  return undefined;
}
