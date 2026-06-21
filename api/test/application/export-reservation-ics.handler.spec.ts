import { NotFoundException } from '@nestjs/common';
import { ExportReservationIcsHandler } from '../../src/application/availability/export-reservation-ics.handler';
import { ExportReservationIcsQuery } from '../../src/application/availability/export-reservation-ics.query';
import { CalendarEntryView } from '../../src/domain/availability/availability.repository.port';

const entry: CalendarEntryView = {
  id: 'res-1',
  start: '2026-07-04',
  end: '2026-07-14',
  reason: 'booked',
  note: null,
  inquiryId: 'inq-9',
  guestName: 'Jan Novák',
  email: 'jan@example.com',
  phone: '+420 777 123 456',
  message: 'Přijedeme večer',
};

const now = new Date('2026-06-21T10:30:00Z');

function makeHandler(entries: CalendarEntryView[]) {
  const availability = { listEntries: jest.fn().mockResolvedValue(entries) };
  const clock = { now: () => now };
  return new ExportReservationIcsHandler(availability as never, clock as never);
}

describe('ExportReservationIcsHandler', () => {
  it('produces a single-event calendar for the requested reservation', async () => {
    const handler = makeHandler([entry]);
    // unfold continuation lines (RFC 5545 §3.1) before substring checks
    const ics = (await handler.execute(new ExportReservationIcsQuery('res-1'))).replace(
      /\r\n[ ]/g,
      '',
    );

    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260704');
    expect(ics).toContain('DTEND;VALUE=DATE:20260714');
    expect(ics).toContain('UID:res-1@vinamar');
    expect(ics).toContain('Jan Novák');
    expect(ics).toContain('+420 777 123 456');
    expect(ics).toContain('jan@example.com');
    // exactly one event
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it('throws NotFound when the reservation does not exist', async () => {
    const handler = makeHandler([entry]);
    await expect(handler.execute(new ExportReservationIcsQuery('nope'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
