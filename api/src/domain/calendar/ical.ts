// Minimal, dependency-free iCalendar (RFC 5545) writer. Scope: all-day VEVENTs
// for reservations, so a stay can be added to Google Calendar / Apple Calendar.
// DTEND for an all-day event is EXCLUSIVE — a stay's departure day is checkout,
// not an occupied night, so the range arrival→departure maps verbatim.

export interface IcalEvent {
  uid: string;
  start: string; // 'YYYY-MM-DD', inclusive (arrival)
  end: string; // 'YYYY-MM-DD', exclusive (departure / checkout)
  summary: string;
  description?: string | null;
}

export interface IcalOptions {
  prodId: string;
  dtstamp: Date;
  calName?: string;
}

const CRLF = '\r\n';
const MAX_OCTETS = 75;

// RFC 5545 §3.3.11: escape backslash, semicolon, comma and newline in TEXT values.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

function toDate(isoDay: string): string {
  return isoDay.replace(/-/g, ''); // 2026-07-04 → 20260704
}

function toUtcStamp(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

// RFC 5545 §3.1: fold logical lines longer than 75 octets. Continuation lines
// start with a single space; we never split inside a multi-byte UTF-8 character.
function fold(line: string): string {
  const out: string[] = [];
  let current = '';
  let octets = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    // continuation lines carry a leading space, leaving 74 octets for content
    const limit = out.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (octets + size > limit) {
      out.push(current);
      current = '';
      octets = 0;
    }
    current += ch;
    octets += size;
  }
  out.push(current);
  return out.map((l, i) => (i === 0 ? l : ' ' + l)).join(CRLF);
}

export function buildIcalendar(events: IcalEvent[], opts: IcalOptions): string {
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${opts.prodId}`, 'CALSCALE:GREGORIAN'];
  if (opts.calName) lines.push(`X-WR-CALNAME:${escapeText(opts.calName)}`);

  const stamp = toUtcStamp(opts.dtstamp);
  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toDate(e.start)}`);
    lines.push(`DTEND;VALUE=DATE:${toDate(e.end)}`);
    lines.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join(CRLF) + CRLF;
}
