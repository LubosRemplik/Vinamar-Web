import { AvailabilityCalendarBuilder } from '../../src/domain/calendar/availability-calendar-builder';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { WindowSuggestion } from '../../src/domain/optimizer/window-suggestion';
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';

const WRO = Origin.fromCode('WRO');
const d = (s: string) => new Date(s);
const block = (start: string, end: string): CalendarBlock =>
  new CalendarBlock('b', new DateRange(d(start), d(end)), 'booked', d('2026-01-01'));
const win = (arrival: string, departure: string, price: number, penalty = 0): WindowSuggestion =>
  new WindowSuggestion(new DateRange(d(arrival), d(departure)), WRO, new Money(price), penalty);

const builder = new AvailabilityCalendarBuilder();
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe('AvailabilityCalendarBuilder', () => {
  it('emits one MonthAvailability per month across the horizon in order', () => {
    const cal = builder.build([], [], d('2026-03-10'), d('2026-05-20'));
    expect(cal.months.map((m) => `${m.year}-${m.month}`)).toEqual(['2026-3', '2026-4', '2026-5']);
  });

  it('computes free ranges as the complement of blocks, clamped to the horizon', () => {
    const blocks = [block('2026-03-15', '2026-03-20')];
    const cal = builder.build(blocks, [], d('2026-03-10'), d('2026-03-31'));
    const march = cal.months.find((m) => m.month === 3)!;
    const ranges = march.freeRanges.map((r) => [iso(r.arrival), iso(r.departure)]);
    expect(ranges).toEqual([
      ['2026-03-10', '2026-03-15'],
      ['2026-03-20', '2026-03-31'],
    ]);
  });

  it('splits a free range that crosses a month boundary', () => {
    const cal = builder.build([], [], d('2026-03-20'), d('2026-04-10'));
    const march = cal.months.find((m) => m.month === 3)!;
    const april = cal.months.find((m) => m.month === 4)!;
    expect(march.freeRanges.map((r) => [iso(r.arrival), iso(r.departure)])).toEqual([
      ['2026-03-20', '2026-04-01'],
    ]);
    expect(april.freeRanges.map((r) => [iso(r.arrival), iso(r.departure)])).toEqual([
      ['2026-04-01', '2026-04-10'],
    ]);
  });

  it('attaches the cheapest window whose arrival falls in the month', () => {
    const windows = [
      win('2026-03-09', '2026-03-16', 80),
      win('2026-03-23', '2026-03-30', 55),
      win('2026-04-06', '2026-04-13', 70),
    ];
    const cal = builder.build([], windows, d('2026-03-01'), d('2026-04-30'));
    const march = cal.months.find((m) => m.month === 3)!;
    const april = cal.months.find((m) => m.month === 4)!;
    expect(march.cheapestWindow!.indicativePrice.amount).toBe(55);
    expect(april.cheapestWindow!.indicativePrice.amount).toBe(70);
  });

  it('leaves cheapestWindow null for a month with no window', () => {
    const cal = builder.build([], [win('2026-03-09', '2026-03-16', 80)], d('2026-03-01'), d('2026-04-30'));
    expect(cal.months.find((m) => m.month === 4)!.cheapestWindow).toBeNull();
  });

  it('emits a fully-booked month with no free ranges and no window', () => {
    const blocks = [block('2026-03-01', '2026-04-01')];
    const cal = builder.build(blocks, [], d('2026-03-01'), d('2026-03-31'));
    const march = cal.months.find((m) => m.month === 3)!;
    expect(march.freeRanges).toEqual([]);
    expect(march.cheapestWindow).toBeNull();
  });
});
