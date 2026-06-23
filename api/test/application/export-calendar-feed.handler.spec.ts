import { ExportCalendarFeedHandler } from '../../src/application/availability/export-calendar-feed.handler';
import { ExportCalendarFeedQuery } from '../../src/application/availability/export-calendar-feed.query';
import { CalendarEntryView } from '../../src/domain/availability/availability.repository.port';

const now = new Date('2026-06-23T08:00:00Z');

const entry = (over: Partial<CalendarEntryView>): CalendarEntryView => ({
  id: 'res-1',
  start: '2026-07-04',
  end: '2026-07-14',
  reason: 'booked',
  note: null,
  inquiryId: 'inq-1',
  guestName: 'Jan Novák',
  email: 'jan@example.com',
  phone: '+420 777 123 456',
  message: null,
  ...over,
});

function makeHandler(entries: CalendarEntryView[]) {
  const availability = { listEntries: jest.fn().mockResolvedValue(entries) };
  const clock = { now: () => now };
  return new ExportCalendarFeedHandler(availability as never, clock as never);
}

describe('ExportCalendarFeedHandler', () => {
  it('returns a valid empty VCALENDAR when there are no reservations', async () => {
    const ics = await makeHandler([]).execute(new ExportCalendarFeedQuery());
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('emits one VEVENT per reservation with a stable UID', async () => {
    const ics = await makeHandler([
      entry({ id: 'a' }),
      entry({ id: 'b', start: '2026-08-01', end: '2026-08-12', guestName: 'Eva Dvořák' }),
    ]).execute(new ExportCalendarFeedQuery());

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('UID:a@vinamar');
    expect(ics).toContain('UID:b@vinamar');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260801');
    // checkout day stays exclusive (no +1)
    expect(ics).toContain('DTEND;VALUE=DATE:20260812');
  });

  it('carries guest name and phone into the event body', async () => {
    const ics = (await makeHandler([entry({})]).execute(new ExportCalendarFeedQuery())).replace(
      /\r\n[ ]/g,
      '',
    );
    expect(ics).toContain('Jan Novák');
    expect(ics).toContain('+420 777 123 456');
  });
});
