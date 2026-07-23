import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { Contract } from '../../domain/contract/contract';
import { ContractNotifier } from '../../domain/contract/contract-notifier.port';
import { contractEmail } from './templates/messages';

@Injectable()
export class SmtpContractNotifier implements ContractNotifier {
  private readonly transport: Transporter = createTransport({
    host: process.env.SMTP_HOST ?? 'mailpit',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  async sendToGuest(contract: Contract, guestEmail: string, pdf: Buffer): Promise<void> {
    const content = contractEmail(contract.guestName);
    await this.transport.sendMail({
      from: process.env.SMTP_FROM ?? 'vinamar@example.com',
      to: guestEmail,
      cc: process.env.OWNER_EMAIL ?? 'owner@example.com',
      subject: content.subject,
      html: content.html,
      text: content.text,
      attachments: [{ filename: 'smlouva.pdf', content: pdf, contentType: 'application/pdf' }],
    });
  }
}
