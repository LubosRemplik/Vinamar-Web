export type EmailContent = { subject: string; html: string; text: string };

// Branding placeholders — finální hodnoty přijdou v bodě L.
const BRAND_NAME = 'Vinamar';
const BRAND_TAGLINE = 'Vinamar — Apartmán La Mata, Torrevieja';
const ACCENT = '#2563eb';

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
      <tbody><tr><td><a href="${cta.url}" target="_blank">${cta.label}</a></td></tr></tbody>
    </table></td></tr></tbody>
  </table>`;
}

// Kostra Postmark `basic-full` (MIT) přepsaná do TS; bloky Twigu = parametry.
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
      body { font-family: Helvetica, sans-serif; font-size: 16px; line-height: 1.3; background-color: #f4f5f6; margin: 0; padding: 0; }
      table { border-collapse: separate; width: 100%; }
      table td { font-family: Helvetica, sans-serif; font-size: 16px; vertical-align: top; }
      .body { background-color: #f4f5f6; width: 100%; }
      .container { margin: 0 auto !important; max-width: 600px; padding-top: 24px; width: 600px; }
      .content { box-sizing: border-box; display: block; margin: 0 auto; max-width: 600px; }
      .main { background: #ffffff; border: 1px solid #eaebed; border-radius: 16px; width: 100%; }
      .wrapper { box-sizing: border-box; padding: 24px; }
      .header { padding: 24px 0 12px; text-align: center; }
      .header a { color: ${ACCENT}; font-size: 24px; font-weight: bold; text-decoration: none; }
      .footer { clear: both; padding-top: 24px; text-align: center; width: 100%; }
      .footer td, .footer p, .footer span, .footer a { color: #9a9ea6; font-size: 14px; text-align: center; }
      p { font-family: Helvetica, sans-serif; font-size: 16px; margin: 0 0 16px; }
      a { color: ${ACCENT}; text-decoration: underline; }
      .btn { box-sizing: border-box; min-width: 100% !important; width: 100%; }
      .btn > tbody > tr > td { padding-bottom: 16px; }
      .btn table { width: auto; }
      .btn table td { background-color: #ffffff; border-radius: 4px; text-align: center; }
      .btn a { background-color: #ffffff; border: solid 2px ${ACCENT}; border-radius: 4px; box-sizing: border-box; color: ${ACCENT}; cursor: pointer; display: inline-block; font-size: 16px; font-weight: bold; padding: 12px 24px; text-decoration: none; }
      .btn-primary table td { background-color: ${ACCENT}; }
      .btn-primary a { background-color: ${ACCENT}; border-color: ${ACCENT}; color: #ffffff; }
      .preheader { color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0; }
      @media only screen and (max-width: 640px) {
        .main p, .main td, .main span { font-size: 16px !important; }
        .wrapper { padding: 8px !important; }
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
        <span class="preheader">${opts.preheader}</span>
        <div class="header"><a href="${publicBaseUrl()}">${BRAND_NAME}</a></div>
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
