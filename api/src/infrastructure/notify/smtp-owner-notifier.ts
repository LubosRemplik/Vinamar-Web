import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { OwnerNotifier } from '../../domain/inquiry/owner-notifier.port';
import { Inquiry } from '../../domain/inquiry/inquiry';
import { bookingCancelledEmail, ownerInquiryReceivedEmail } from './templates/messages';

@Injectable()
export class SmtpOwnerNotifier implements OwnerNotifier {
  private readonly transport: Transporter = createTransport({
    host: process.env.SMTP_HOST ?? 'mailpit',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  async inquiryReceived(inquiry: Inquiry): Promise<void> {
    const content = ownerInquiryReceivedEmail(inquiry);
    await this.transport.sendMail({
      from: process.env.SMTP_FROM ?? 'vinamar@example.com',
      to: process.env.OWNER_EMAIL ?? 'owner@example.com',
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  }

  async bookingCancelled(inquiry: Inquiry): Promise<void> {
    const content = bookingCancelledEmail(inquiry, { isOwner: true });
    await this.transport.sendMail({
      from: process.env.SMTP_FROM ?? 'vinamar@example.com',
      to: process.env.OWNER_EMAIL ?? 'owner@example.com',
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  }
}
