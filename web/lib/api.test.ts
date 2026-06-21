import { describe, it, expect } from 'vitest';
import { googleCalendarUrl, type CalendarEntry } from './api';

const entry: CalendarEntry = {
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

describe('googleCalendarUrl', () => {
  it('builds an all-day TEMPLATE link with an exclusive end date', () => {
    const url = new URL(googleCalendarUrl(entry));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    // departure day is checkout → end stays as-is (no +1)
    expect(url.searchParams.get('dates')).toBe('20260704/20260714');
    expect(url.searchParams.get('text')).toBe('Vinamar — Jan Novák');
  });

  it('carries guest name and phone into the details', () => {
    const details = new URL(googleCalendarUrl(entry)).searchParams.get('details') ?? '';
    expect(details).toContain('Jan Novák');
    expect(details).toContain('+420 777 123 456');
  });

  it('falls back to a generic title when no guest name', () => {
    const url = new URL(googleCalendarUrl({ ...entry, guestName: null }));
    expect(url.searchParams.get('text')).toBe('Vinamar — Rezervace');
  });
});
