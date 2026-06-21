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
  return `<p><strong>Termín pobytu:</strong> ${stay(inquiry)}</p>`;
}

export function inquiryReceivedEmail(inquiry: Inquiry): EmailContent {
  return {
    subject: 'Přijali jsme vaši poptávku',
    text: `Dobrý den ${inquiry.guestName},\nzaznamenali jsme vaši poptávku na termín ${stay(inquiry)} a brzy se vám ozveme s potvrzením dostupnosti.\n\nVinamar`,
    html: baseLayout({
      preheader: 'Vaši poptávku jsme zaznamenali',
      content:
        greeting(inquiry.guestName) +
        '<p>děkujeme za vaši poptávku pobytu v apartmánu Vinamar. Zaznamenali jsme ji a brzy se vám ozveme s potvrzením dostupnosti.</p>' +
        stayParagraph(inquiry),
      cta: { label: 'Zobrazit web', url: publicBaseUrl() },
    }),
  };
}

export function bookingConfirmedEmail(inquiry: Inquiry): EmailContent {
  return {
    subject: 'Vaše rezervace je potvrzena',
    text: `Dobrý den ${inquiry.guestName},\nvaše rezervace pobytu v apartmánu Vinamar na termín ${stay(inquiry)} je závazně potvrzena.\n\nVinamar`,
    html: baseLayout({
      preheader: 'Vaše rezervace je potvrzena',
      content:
        greeting(inquiry.guestName) +
        '<p>vaše rezervace pobytu v apartmánu Vinamar je závazně potvrzena.</p>' +
        stayParagraph(inquiry),
      cta: { label: 'Zobrazit web', url: publicBaseUrl() },
    }),
  };
}

export function inquiryDeclinedEmail(inquiry: Inquiry): EmailContent {
  return {
    subject: 'K vaší poptávce pobytu',
    text: `Dobrý den ${inquiry.guestName},\nděkujeme za zájem o apartmán Vinamar. Termín ${stay(inquiry)} bohužel nemůžeme potvrdit. Podívejte se prosím na další volné termíny.\n\nVinamar`,
    html: baseLayout({
      preheader: 'K vaší poptávce pobytu',
      content:
        greeting(inquiry.guestName) +
        '<p>děkujeme za zájem o apartmán Vinamar. Vámi poptávaný termín bohužel nemůžeme potvrdit.</p>' +
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
      text: `Rezervace ${inquiry.guestName} na termín ${stay(inquiry)} byla zrušena a termín se uvolnil.\n\nVinamar`,
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
    text: `Dobrý den ${inquiry.guestName},\nvaše rezervace pobytu v apartmánu Vinamar na termín ${stay(inquiry)} byla zrušena.\n\nVinamar`,
    html: baseLayout({
      preheader: 'Vaše rezervace byla zrušena',
      content:
        greeting(inquiry.guestName) +
        '<p>vaše rezervace pobytu v apartmánu Vinamar byla zrušena.</p>' +
        stayParagraph(inquiry),
    }),
  };
}

export function arrivalReminderEmail(inquiry: Inquiry): EmailContent {
  return {
    subject: 'Blíží se váš pobyt',
    text: `Dobrý den ${inquiry.guestName},\nblíží se termín vašeho pobytu v apartmánu Vinamar (${stay(inquiry)}). Těšíme se na vás!\n\nVinamar`,
    html: baseLayout({
      preheader: 'Blíží se váš pobyt',
      content:
        greeting(inquiry.guestName) +
        '<p>blíží se termín vašeho pobytu v apartmánu Vinamar. Těšíme se na vás!</p>' +
        stayParagraph(inquiry),
    }),
  };
}
