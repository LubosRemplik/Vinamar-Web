import { Injectable, Optional } from '@nestjs/common';
import { Transporter } from 'nodemailer';
import { OwnerNotifier } from '../../domain/inquiry/owner-notifier.port';
import { Inquiry } from '../../domain/inquiry/inquiry';
import { createSmtpTransport, mailReplyTo } from './smtp-transport';
import { EmailContent } from './templates/base';
import { bookingCancelledEmail, ownerInquiryReceivedEmail } from './templates/messages';

@Injectable()
export class SmtpOwnerNotifier implements OwnerNotifier {
  constructor(
    @Optional()
    private readonly transport: Transporter = createSmtpTransport(),
  ) {}

  private async send(content: EmailContent): Promise<void> {
    await this.transport.sendMail({
      from: process.env.SMTP_FROM ?? 'vinamar@example.com',
      replyTo: mailReplyTo(),
      to: process.env.OWNER_EMAIL ?? 'owner@example.com',
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  }

  async inquiryReceived(inquiry: Inquiry): Promise<void> {
    await this.send(ownerInquiryReceivedEmail(inquiry));
  }

  async bookingCancelled(inquiry: Inquiry): Promise<void> {
    await this.send(bookingCancelledEmail(inquiry, { isOwner: true }));
  }
}
