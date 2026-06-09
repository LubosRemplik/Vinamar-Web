import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { OwnerNotifier } from '../../domain/inquiry/owner-notifier.port';
import { Inquiry } from '../../domain/inquiry/inquiry';

@Injectable()
export class SmtpOwnerNotifier implements OwnerNotifier {
  private readonly transport: Transporter = createTransport({
    host: process.env.SMTP_HOST ?? 'mailpit',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  async inquiryReceived(inquiry: Inquiry): Promise<void> {
    await this.transport.sendMail({
      from: process.env.SMTP_FROM ?? 'vinamar@example.com',
      to: process.env.OWNER_EMAIL ?? 'owner@example.com',
      subject: `Nová poptávka: ${inquiry.guestName}`,
      text:
        `${inquiry.guestName} (${inquiry.email.value}${inquiry.phone ? `, tel. ${inquiry.phone}` : ''})\n` +
        `${inquiry.range.arrival.toISOString().slice(0, 10)} → ` +
        `${inquiry.range.departure.toISOString().slice(0, 10)}\n\n${inquiry.message}`,
    });
  }
}
