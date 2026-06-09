import { FindAvailabilityCalendarHandler } from '../../src/application/calendar/find-availability-calendar.handler';
import { FindAvailabilityCalendarQuery } from '../../src/application/calendar/find-availability-calendar.query';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';
import { FlightQuote } from '../../src/domain/flight/flight-quote';

const now = new Date('2026-03-01');
const WRO = Origin.fromCode('WRO');
const quote = (day: string, price: number) =>
  new FlightQuote(WRO, new Date(day), new Date(day), new Money(price), 'FR', 'x', now);

const quotes = {
  listForOrigin: jest.fn().mockResolvedValue([quote('2026-03-09', 80), quote('2026-03-23', 55)]),
};
const availability = {
  listBetween: jest
    .fn()
    .mockResolvedValue([new CalendarBlock('b', new DateRange(new Date('2026-03-12'), new Date('2026-03-16')), 'booked', now)]),
};
const deepLink = { forDates: jest.fn().mockReturnValue('https://aviasales.com/search/WROALC') };
const clock = { now: () => now };

describe('FindAvailabilityCalendarHandler', () => {
  const handler = new FindAvailabilityCalendarHandler(
    quotes as never,
    availability as never,
    deepLink as never,
    clock as never,
  );

  it('returns months with free ranges and a cheapest window carrying a deep link', async () => {
    const out = await handler.execute(new FindAvailabilityCalendarQuery('WRO', 7, 2));
    expect(out.origin).toBe('WRO');
    expect(out.months.length).toBe(2);
    const march = out.months.find((m) => m.month === 3)!;
    expect(march.cheapest!.indicativePrice).toBe(55);
    expect(march.cheapest!.flightDeepLink).toBe('https://aviasales.com/search/WROALC');
    expect(march.freeRanges.length).toBeGreaterThan(0);
    expect(march.freeRanges[0].start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
