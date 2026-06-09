import { FindCheapestWindowsHandler } from '../../src/application/optimizer/find-cheapest-windows.handler';
import { FindCheapestWindowsQuery } from '../../src/application/optimizer/find-cheapest-windows.query';
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';
import { FlightQuote } from '../../src/domain/flight/flight-quote';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { FlightDeepLinkBuilder } from '../../src/domain/flight/flight-deep-link-builder.port';
import { InMemoryFlightQuotes } from '../fakes/flight';
import { InMemoryAvailability, FixedClock } from '../fakes';

const stubDeepLink: FlightDeepLinkBuilder = {
  forDates: (): string => 'https://book/exact?marker=m',
};

describe('FindCheapestWindows', () => {
  it('returns available windows cheapest-first with exact-date deep links', async () => {
    const WRO = Origin.fromCode('WRO');
    const fetchedAt = new Date('2026-01-01');
    const quotes = new InMemoryFlightQuotes();
    await quotes.replaceForOrigin(WRO, [
      new FlightQuote(
        WRO,
        new Date('2026-05-08'),
        new Date('2026-05-15'),
        new Money(90),
        'FR',
        'x',
        fetchedAt,
      ),
      new FlightQuote(
        WRO,
        new Date('2026-05-15'),
        new Date('2026-05-22'),
        new Money(58),
        'FR',
        'x',
        fetchedAt,
      ),
    ]);
    const availability = new InMemoryAvailability();
    availability.blocks.push(
      new CalendarBlock(
        'b',
        new DateRange(new Date('2026-05-09'), new Date('2026-05-12')),
        'booked',
        new Date(),
      ),
    );

    const handler = new FindCheapestWindowsHandler(
      quotes,
      availability,
      stubDeepLink,
      new FixedClock(new Date('2026-01-01')),
    );
    const out = await handler.execute(new FindCheapestWindowsQuery('WRO', 7));

    expect(out).toHaveLength(1);
    expect(out[0].arrival).toBe('2026-05-15');
    expect(out[0].indicativePrice).toBe(58);
    expect(out[0].flightDeepLink).toContain('marker=m');
  });

  it('caps results at the requested limit', async () => {
    const WRO = Origin.fromCode('WRO');
    const fetchedAt = new Date('2026-01-01');
    const quotes = new InMemoryFlightQuotes();
    await quotes.replaceForOrigin(WRO, [
      new FlightQuote(WRO, new Date('2026-05-08'), new Date('2026-05-15'), new Money(90), 'FR', 'x', fetchedAt),
      new FlightQuote(WRO, new Date('2026-05-15'), new Date('2026-05-22'), new Money(58), 'FR', 'x', fetchedAt),
      new FlightQuote(WRO, new Date('2026-05-22'), new Date('2026-05-29'), new Money(70), 'FR', 'x', fetchedAt),
    ]);

    const handler = new FindCheapestWindowsHandler(
      quotes,
      new InMemoryAvailability(),
      stubDeepLink,
      new FixedClock(new Date('2026-01-01')),
    );
    const out = await handler.execute(new FindCheapestWindowsQuery('WRO', 7, 2));

    expect(out).toHaveLength(2);
    expect(out.map((w) => w.indicativePrice)).toEqual([58, 70]);
  });
});
