import { CheapestWindowFinder } from '../../src/domain/optimizer/cheapest-window-finder';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';
import { FlightQuote } from '../../src/domain/flight/flight-quote';

const WRO = Origin.fromCode('WRO');
const now = new Date('2026-01-01');
const quote = (day: string, price: number): FlightQuote =>
  new FlightQuote(WRO, new Date(day), new Date(day), new Money(price), 'FR', 'x', now);
const block = (start: string, end: string): CalendarBlock =>
  new CalendarBlock('b', new DateRange(new Date(start), new Date(end)), 'booked', now);

describe('CheapestWindowFinder', () => {
  const finder = new CheapestWindowFinder();

  it('ranks windows cheapest flight first', () => {
    const quotes = [quote('2026-05-08', 90), quote('2026-05-15', 58), quote('2026-05-22', 70)];
    const out = finder.find(quotes, [], 7, now);
    expect(out.map((s) => s.indicativePrice.amount)).toEqual([58, 70, 90]);
  });

  it('skips windows that overlap a block', () => {
    const quotes = [quote('2026-05-08', 58)];
    const blocks = [block('2026-05-10', '2026-05-14')];
    expect(finder.find(quotes, blocks, 7, now)).toHaveLength(0);
  });

  it('ignores arrivals in the past', () => {
    const quotes = [quote('2025-05-08', 30), quote('2026-05-08', 58)];
    const out = finder.find(quotes, [], 7, now);
    expect(out).toHaveLength(1);
    expect(out[0].range.arrival.toISOString().slice(0, 10)).toBe('2026-05-08');
  });

  it('supports arbitrary stay length', () => {
    const out = finder.find([quote('2026-05-08', 58)], [], 10, now);
    expect(out[0].range.nights()).toBe(10);
  });

  it('breaks price ties by preferring windows that leave no orphan gap', () => {
    // Block ends 2026-05-08. Window A arrives 2026-05-08 (flush, 0 gap).
    // Window B arrives 2026-05-10 (2-night orphan before, unbookable). Same price.
    const quotes = [quote('2026-05-08', 58), quote('2026-05-10', 58)];
    const blocks = [block('2026-05-01', '2026-05-08')];
    const out = finder.find(quotes, blocks, 7, now);
    expect(out[0].range.arrival.toISOString().slice(0, 10)).toBe('2026-05-08');
    expect(out[0].orphanPenalty).toBe(0);
    expect(out[1].orphanPenalty).toBeGreaterThan(0);
  });

  it('returns nothing for empty quotes', () => {
    expect(finder.find([], [block('2026-05-01', '2026-05-08')], 7, now)).toHaveLength(0);
  });

  it('detects an orphan gap after the window before the next block', () => {
    // Window 2026-05-08..2026-05-15; next block starts 2026-05-18 => 3-night orphan after.
    const quotes = [quote('2026-05-08', 58)];
    const blocks = [block('2026-05-18', '2026-05-25')];
    const out = finder.find(quotes, blocks, 7, now);
    expect(out).toHaveLength(1);
    expect(out[0].orphanPenalty).toBe(7 - 3);
  });

  it('does not penalise a gap of at least minStay nights', () => {
    // Window 2026-05-08..2026-05-15; next block starts 2026-05-22 => 7-night gap (bookable).
    const quotes = [quote('2026-05-08', 58)];
    const blocks = [block('2026-05-22', '2026-05-29')];
    const out = finder.find(quotes, blocks, 7, now);
    expect(out[0].orphanPenalty).toBe(0);
  });

  it('sums penalties from orphan gaps on both sides', () => {
    // Block before ends 2026-05-06 (2-night gap => penalty 5),
    // window 2026-05-08..2026-05-15, block after starts 2026-05-16 (1-night gap => penalty 6).
    const quotes = [quote('2026-05-08', 58)];
    const blocks = [block('2026-05-01', '2026-05-06'), block('2026-05-16', '2026-05-23')];
    const out = finder.find(quotes, blocks, 7, now);
    expect(out[0].orphanPenalty).toBe(7 - 2 + (7 - 1));
  });
});
