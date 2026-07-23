export type EmailContent = { subject: string; html: string; text: string };

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ViñaMar identity, mirrored from the website (web/tailwind.config.ts).
const BRAND_NAME = 'ViñaMar';
const BRAND_SUBTITLE = 'La Mata · Torrevieja';
const BRAND_TAGLINE = 'ViñaMar · Apartmán u moře, La Mata';

// Palette. Kept as hex literals because email clients need them inline, not as
// CSS variables.
const INK = '#1F3A34';
const PAPER = '#FBF8F3';
const SAGE = '#61716A';
const BRASS = '#A9885A';
const LINE = '#E4DCCF';
const CARD = '#FFFFFF';

// The website sets the wordmark in Kaushan Script, but a webfont does not load
// reliably in mail clients (Gmail strips it, Outlook ignores it), so the email
// wordmark falls back to the same serif the site uses for its headings.
const SERIF = "Georgia, 'Times New Roman', Cambria, serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function publicBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? '#';
}

// Formát je čistě číselný (žádné názvy měsíců), proto stačí ruční složení v UTC.
export function formatCzechDate(d: Date): string {
  return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`;
}

function ctaBlock(cta?: { label: string; url: string }): string {
  if (!cta) return '';
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary">
    <tbody><tr><td align="left"><table role="presentation" border="0" cellpadding="0" cellspacing="0">
      <tbody><tr><td><a href="${esc(cta.url)}" target="_blank">${esc(cta.label)}</a></td></tr></tbody>
    </table></td></tr></tbody>
  </table>`;
}

// Kostra Postmark `basic-full` (MIT) přepsaná do TS; bloky Twigu = parametry.
// Vzhled sladěný s prezentačním webem (identita ViñaMar).
export function baseLayout(opts: {
  preheader: string;
  content: string;
  cta?: { label: string; url: string };
}): string {
  return `<!doctype html>
<html lang="cs">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>${BRAND_NAME}</title>
    <style media="all" type="text/css">
      body { font-family: ${SANS}; font-size: 16px; line-height: 1.5; background-color: ${PAPER}; margin: 0; padding: 0; color: ${INK}; }
      table { border-collapse: separate; width: 100%; }
      table td { font-family: ${SANS}; font-size: 16px; vertical-align: top; }
      .body { background-color: ${PAPER}; width: 100%; }
      .container { margin: 0 auto !important; max-width: 600px; padding-top: 24px; width: 600px; }
      .content { box-sizing: border-box; display: block; margin: 0 auto; max-width: 600px; }
      .main { background: ${CARD}; border: 1px solid ${LINE}; border-radius: 4px; width: 100%; }
      .wrapper { box-sizing: border-box; padding: 32px; color: ${INK}; }
      .header { padding: 28px 0 20px; text-align: center; }
      .header .brand { color: ${INK}; font-family: ${SERIF}; font-size: 30px; font-weight: 400; letter-spacing: 1px; text-decoration: none; }
      .header .subtitle { color: ${SAGE}; font-family: ${SANS}; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; padding-top: 6px; }
      .footer { clear: both; padding-top: 24px; text-align: center; width: 100%; }
      .footer td, .footer p, .footer span, .footer a { color: ${SAGE}; font-size: 13px; text-align: center; }
      h2 { font-family: ${SERIF}; font-size: 22px; font-weight: 400; color: ${INK}; margin: 0 0 16px; }
      p { font-family: ${SANS}; font-size: 16px; line-height: 1.6; color: ${INK}; margin: 0 0 16px; }
      a { color: ${INK}; text-decoration: underline; }
      .rule { border: 0; border-top: 1px solid ${BRASS}; width: 36px; margin: 20px 0; }
      .stay { background-color: ${PAPER}; border: 1px solid ${LINE}; border-radius: 4px; padding: 14px 18px; margin: 0 0 16px; }
      .stay p { margin: 0; }
      .btn { box-sizing: border-box; min-width: 100% !important; width: 100%; padding-top: 8px; }
      .btn > tbody > tr > td { padding-bottom: 16px; }
      .btn table { width: auto; }
      .btn table td { background-color: ${CARD}; border-radius: 2px; text-align: center; }
      .btn a { background-color: ${CARD}; border: solid 1px ${INK}; border-radius: 2px; box-sizing: border-box; color: ${INK}; cursor: pointer; display: inline-block; font-size: 12px; font-weight: 400; letter-spacing: 2px; text-transform: uppercase; padding: 13px 28px; text-decoration: none; }
      .btn-primary table td { background-color: ${INK}; }
      .btn-primary a { background-color: ${INK}; border-color: ${INK}; color: ${PAPER}; }
      .preheader { color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0; }
      @media only screen and (max-width: 640px) {
        .main p, .main td, .main span { font-size: 16px !important; }
        .wrapper { padding: 20px !important; }
        .container { padding: 0 !important; padding-top: 8px !important; width: 100% !important; }
        .main { border-left-width: 0 !important; border-radius: 0 !important; border-right-width: 0 !important; }
        .btn table, .btn a { max-width: 100% !important; width: 100% !important; }
      }
      .apple-link a { color: inherit !important; font-family: inherit !important; font-size: inherit !important; font-weight: inherit !important; line-height: inherit !important; text-decoration: none !important; }
      #MessageViewBody a { color: inherit; text-decoration: none; font-size: inherit; font-family: inherit; font-weight: inherit; line-height: inherit; }
    </style>
  </head>
  <body>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body"><tr>
      <td>&nbsp;</td>
      <td class="container"><div class="content">
        <span class="preheader">${esc(opts.preheader)}</span>
        <div class="header">
          <a href="${publicBaseUrl()}" class="brand">${BRAND_NAME}</a>
          <div class="subtitle">${esc(BRAND_SUBTITLE)}</div>
        </div>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="main"><tr>
          <td class="wrapper">${opts.content}${ctaBlock(opts.cta)}</td>
        </tr></table>
        <div class="footer"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
          <td class="content-block"><span class="apple-link">${BRAND_TAGLINE}</span></td>
        </tr></table></div>
      </div></td>
      <td>&nbsp;</td>
    </tr></table>
  </body>
</html>`;
}
