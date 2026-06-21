import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { Contract } from '../../domain/contract/contract';
import { ContractNotifier } from '../../domain/contract/contract-notifier.port';

@Injectable()
export class SmtpContractNotifier implements ContractNotifier {
  private readonly transport: Transporter = createTransport({
    host: process.env.SMTP_HOST ?? 'mailpit',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  async sendToGuest(contract: Contract, guestEmail: string, pdf: Buffer): Promise<void> {
    await this.transport.sendMail({
      from: process.env.SMTP_FROM ?? 'vinamar@example.com',
      to: guestEmail,
      cc: process.env.OWNER_EMAIL ?? 'owner@example.com',
      subject: 'Nájemní smlouva — La Mata, Torrevieja',
      text:
        `Dobrý den ${contract.guestName},\n\n` +
        `v příloze zasíláme nájemní smlouvu k Vašemu pobytu. ` +
        `Prosíme o její kontrolu a podpis.\n\n` +
        `S pozdravem,\nVinamar`,
      attachments: [{ filename: 'smlouva.pdf', content: pdf, contentType: 'application/pdf' }],
    });
  }
}
