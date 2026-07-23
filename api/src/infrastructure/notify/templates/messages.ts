import { Inquiry } from '../../../domain/inquiry/inquiry';
import { EmailContent, baseLayout, esc, formatCzechDate, publicBaseUrl } from './base';

export { formatCzechDate } from './base';

function stay(inquiry: Inquiry): string {
  return `${formatCzechDate(inquiry.range.arrival)} → ${formatCzechDate(inquiry.range.departure)}`;
}

function greeting(name: string): string {
  return `<p>Dobrý den ${esc(name)},</p>`;
}

function stayParagraph(inquiry: Inquiry): string {
  return `<div class="stay"><p><strong>Termín pobytu:</strong> ${stay(inquiry)}</p></div>`;
}

export function inquiryReceivedEmail(inquiry: Inquiry): EmailContent {
  return {
    subject: 'Přijali jsme vaši poptávku',
    text: `Dobrý den ${inquiry.guestName},\nzaznamenali jsme vaši poptávku na termín ${stay(inquiry)} a brzy se vám ozveme s potvrzením dostupnosti.\n\nViñaMar`,
    html: baseLayout({
      preheader: 'Vaši poptávku jsme zaznamenali',
      content:
        greeting(inquiry.guestName) +
        '<p>děkujeme za vaši poptávku pobytu v apartmánu ViñaMar. Zaznamenali jsme ji a brzy se vám ozveme s potvrzením dostupnosti.</p>' +
        stayParagraph(inquiry),
      cta: { label: 'Zobrazit web', url: publicBaseUrl() },
    }),
  };
}

export function bookingConfirmedEmail(inquiry: Inquiry): EmailContent {
  return {
    subject: 'Vaše rezervace je potvrzena',
    text: `Dobrý den ${inquiry.guestName},\nvaše rezervace pobytu v apartmánu ViñaMar na termín ${stay(inquiry)} je závazně potvrzena.\n\nViñaMar`,
    html: baseLayout({
      preheader: 'Vaše rezervace je potvrzena',
      content:
        greeting(inquiry.guestName) +
        '<p>vaše rezervace pobytu v apartmánu ViñaMar je závazně potvrzena.</p>' +
        stayParagraph(inquiry),
      cta: { label: 'Zobrazit web', url: publicBaseUrl() },
    }),
  };
}

export function inquiryDeclinedEmail(inquiry: Inquiry): EmailContent {
  return {
    subject: 'K vaší poptávce pobytu',
    text: `Dobrý den ${inquiry.guestName},\nděkujeme za zájem o apartmán ViñaMar. Termín ${stay(inquiry)} bohužel nemůžeme potvrdit. Podívejte se prosím na další volné termíny.\n\nViñaMar`,
    html: baseLayout({
      preheader: 'K vaší poptávce pobytu',
      content:
        greeting(inquiry.guestName) +
        '<p>děkujeme za zájem o apartmán ViñaMar. Vámi poptávaný termín bohužel nemůžeme potvrdit.</p>' +
        stayParagraph(inquiry) +
        '<p>Podívejte se prosím na další volné termíny.</p>',
      cta: { label: 'Volné termíny', url: publicBaseUrl() },
    }),
  };
}

export function bookingCancelledEmail(
  inquiry: Inquiry,
  opts: { isOwner: boolean },
): EmailContent {
  if (opts.isOwner) {
    return {
      subject: 'Rezervace byla zrušena',
      text: `Rezervace ${inquiry.guestName} na termín ${stay(inquiry)} byla zrušena a termín se uvolnil.\n\nViñaMar`,
      html: baseLayout({
        preheader: 'Rezervace byla zrušena',
        content:
          '<p>Dobrý den,</p>' +
          `<p>rezervace hosta <strong>${esc(inquiry.guestName)}</strong> byla zrušena a termín se uvolnil.</p>` +
          stayParagraph(inquiry),
      }),
    };
  }
  return {
    subject: 'Vaše rezervace byla zrušena',
    text: `Dobrý den ${inquiry.guestName},\nvaše rezervace pobytu v apartmánu ViñaMar na termín ${stay(inquiry)} byla zrušena.\n\nViñaMar`,
    html: baseLayout({
      preheader: 'Vaše rezervace byla zrušena',
      content:
        greeting(inquiry.guestName) +
        '<p>vaše rezervace pobytu v apartmánu ViñaMar byla zrušena.</p>' +
        stayParagraph(inquiry),
    }),
  };
}

// Majiteli — nová poptávka od hosta, s kontaktem a zprávou.
export function ownerInquiryReceivedEmail(inquiry: Inquiry): EmailContent {
  const contactLines = [
    `E-mail: ${inquiry.email.value}`,
    inquiry.phone ? `Telefon: ${inquiry.phone}` : '',
  ].filter(Boolean);

  const contactHtml = [
    `<p><strong>${esc(inquiry.guestName)}</strong><br>` +
      `${esc(inquiry.email.value)}` +
      (inquiry.phone ? `<br>${esc(inquiry.phone)}` : '') +
      `</p>`,
  ].join('');

  const messageHtml = inquiry.message
    ? `<p style="white-space: pre-line;">${esc(inquiry.message)}</p>`
    : '';

  return {
    subject: `Nová poptávka: ${inquiry.guestName}`,
    text:
      `${inquiry.guestName}\n` +
      `${contactLines.join('\n')}\n` +
      `Termín: ${stay(inquiry)}\n\n` +
      `${inquiry.message}`,
    html: baseLayout({
      preheader: `Nová poptávka: ${inquiry.guestName}`,
      content:
        '<h2>Nová poptávka</h2>' +
        contactHtml +
        stayParagraph(inquiry) +
        messageHtml,
      cta: { label: 'Otevřít administraci', url: `${publicBaseUrl()}/admin` },
    }),
  };
}

export function arrivalReminderEmail(inquiry: Inquiry): EmailContent {
  return {
    subject: 'Blíží se váš pobyt',
    text: `Dobrý den ${inquiry.guestName},\nblíží se termín vašeho pobytu v apartmánu ViñaMar (${stay(inquiry)}). Těšíme se na vás!\n\nViñaMar`,
    html: baseLayout({
      preheader: 'Blíží se váš pobyt',
      content:
        greeting(inquiry.guestName) +
        '<p>blíží se termín vašeho pobytu v apartmánu ViñaMar. Těšíme se na vás!</p>' +
        stayParagraph(inquiry),
    }),
  };
}
