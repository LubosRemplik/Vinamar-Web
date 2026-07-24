import { Injectable, Optional } from '@nestjs/common';
import { Transporter } from 'nodemailer';
import { GuestNotifier } from '../../domain/inquiry/guest-notifier.port';
import { Inquiry } from '../../domain/inquiry/inquiry';
import { createSmtpTransport, mailReplyTo } from './smtp-transport';
import { EmailContent } from './templates/base';
import {
  inquiryReceivedEmail,
  bookingConfirmedEmail,
  inquiryDeclinedEmail,
  bookingCancelledEmail,
  arrivalReminderEmail,
} from './templates/messages';

@Injectable()
export class SmtpGuestNotifier implements GuestNotifier {
  constructor(
    @Optional()
    private readonly transport: Transporter = createSmtpTransport(),
  ) {}

  private async send(to: string, content: EmailContent): Promise<void> {
    await this.transport.sendMail({
      from: {
        name: process.env.MAIL_FROM_NAME ?? 'ViñaMar',
        address: process.env.SMTP_FROM ?? 'vinamar@example.com',
      },
      replyTo: mailReplyTo(),
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  }

  inquiryReceived(inquiry: Inquiry): Promise<void> {
    return this.send(inquiry.email.value, inquiryReceivedEmail(inquiry));
  }
  bookingConfirmed(inquiry: Inquiry): Promise<void> {
    return this.send(inquiry.email.value, bookingConfirmedEmail(inquiry));
  }
  inquiryDeclined(inquiry: Inquiry): Promise<void> {
    return this.send(inquiry.email.value, inquiryDeclinedEmail(inquiry));
  }
  bookingCancelled(inquiry: Inquiry): Promise<void> {
    return this.send(inquiry.email.value, bookingCancelledEmail(inquiry, { isOwner: false }));
  }
  arrivalReminder(inquiry: Inquiry): Promise<void> {
    return this.send(inquiry.email.value, arrivalReminderEmail(inquiry));
  }
}
