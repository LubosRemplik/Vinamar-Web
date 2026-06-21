import { buildIcalendar } from '../../src/domain/calendar/ical';

const dtstamp = new Date('2026-06-21T10:30:00Z');

function lines(ics: string): string[] {
  // Unfold (RFC5545 §3.1: a CRLF followed by a space continues the previous line)
  return ics.replace(/\r\n[ ]/g, '').split('\r\n');
}

describe('buildIcalendar', () => {
  it('wraps events in a VCALENDAR with CRLF line endings', () => {
    const ics = buildIcalendar([], { prodId: '-//Vinamar//Rezervace//CS', dtstamp });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    const ls = lines(ics);
    expect(ls).toContain('VERSION:2.0');
    expect(ls).toContain('PRODID:-//Vinamar//Rezervace//CS');
    expect(ls).toContain('CALSCALE:GREGORIAN');
  });

  it('emits an all-day VEVENT with an exclusive DTEND (no +1 on departure)', () => {
    const ics = buildIcalendar(
      [
        {
          uid: 'res-1@vinamar',
          start: '2026-07-04',
          end: '2026-07-14',
          summary: 'Vinamar — Jan Novák',
        },
      ],
      { prodId: '-//Vinamar//Rezervace//CS', dtstamp },
    );
    const ls = lines(ics);
    expect(ls).toContain('BEGIN:VEVENT');
    expect(ls).toContain('UID:res-1@vinamar');
    expect(ls).toContain('DTSTAMP:20260621T103000Z');
    expect(ls).toContain('DTSTART;VALUE=DATE:20260704');
    // departure day is checkout, not an occupied night → DTEND stays as-is
    expect(ls).toContain('DTEND;VALUE=DATE:20260714');
    expect(ls).toContain('SUMMARY:Vinamar — Jan Novák');
    expect(ls).toContain('END:VEVENT');
  });

  it('escapes commas, semicolons, backslashes and newlines in text fields', () => {
    const ics = buildIcalendar(
      [
        {
          uid: 'res-2@vinamar',
          start: '2026-08-01',
          end: '2026-08-11',
          summary: 'Host; Novák, Jan',
          description: 'Telefon: +420 111\nPozn.: a\\b',
        },
      ],
      { prodId: '-//Vinamar//Rezervace//CS', dtstamp },
    );
    const ls = lines(ics);
    expect(ls).toContain('SUMMARY:Host\\; Novák\\, Jan');
    expect(ls).toContain('DESCRIPTION:Telefon: +420 111\\nPozn.: a\\\\b');
  });

  it('omits DESCRIPTION when not provided', () => {
    const ics = buildIcalendar(
      [{ uid: 'u@vinamar', start: '2026-09-01', end: '2026-09-11', summary: 'X' }],
      { prodId: 'p', dtstamp },
    );
    expect(ics).not.toContain('DESCRIPTION:');
  });

  it('folds lines longer than 75 octets', () => {
    const longName = 'á'.repeat(120); // multibyte → exercises octet-aware folding
    const ics = buildIcalendar(
      [{ uid: 'u@vinamar', start: '2026-09-01', end: '2026-09-11', summary: longName }],
      { prodId: 'p', dtstamp },
    );
    const physical = ics.split('\r\n');
    for (const line of physical) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    // and it still round-trips after unfolding
    expect(lines(ics)).toContain(`SUMMARY:${longName}`);
  });
});
