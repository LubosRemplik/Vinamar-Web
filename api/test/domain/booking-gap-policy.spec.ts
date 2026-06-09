import { BookingGapPolicy } from '../../src/domain/availability/booking-gap-policy';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock } from '../../src/domain/availability/calendar-block';

const block = (start: string, end: string): CalendarBlock =>
  new CalendarBlock('b', new DateRange(new Date(start), new Date(end)), 'booked', new Date('2026-01-01'));
const range = (a: string, d: string) => new DateRange(new Date(a), new Date(d));

const policy = new BookingGapPolicy();
const MIN = 7;
// A booked week ending (checkout) on 2026-07-13.
const before = [block('2026-07-06', '2026-07-13')];

describe('BookingGapPolicy', () => {
  it('allows a booking flush against the previous block (gap 0)', () => {
    expect(policy.wouldCreateOrphanGap(range('2026-07-13', '2026-07-20'), before, MIN)).toBe(false);
  });

  it('allows a 2-night turnover gap', () => {
    expect(policy.wouldCreateOrphanGap(range('2026-07-15', '2026-07-22'), before, MIN)).toBe(false);
  });

  it('rejects a 3-night orphan gap before the booking', () => {
    expect(policy.wouldCreateOrphanGap(range('2026-07-16', '2026-07-23'), before, MIN)).toBe(true);
  });

  it('rejects a 6-night orphan gap before the booking', () => {
    expect(policy.wouldCreateOrphanGap(range('2026-07-19', '2026-07-26'), before, MIN)).toBe(true);
  });

  it('allows a gap of at least the minimum stay (7 nights, re-bookable)', () => {
    expect(policy.wouldCreateOrphanGap(range('2026-07-20', '2026-07-27'), before, MIN)).toBe(false);
  });

  it('rejects an orphan gap after the booking', () => {
    // next block starts 2026-07-24; booking 2026-07-13..2026-07-20 leaves a 4-night gap.
    expect(policy.wouldCreateOrphanGap(range('2026-07-13', '2026-07-20'), [block('2026-07-24', '2026-07-31')], MIN)).toBe(true);
  });

  it('ignores blocks that are far away', () => {
    expect(policy.wouldCreateOrphanGap(range('2026-07-13', '2026-07-20'), [block('2026-09-01', '2026-09-08')], MIN)).toBe(false);
  });

  it('never reports an orphan when there are no blocks', () => {
    expect(policy.wouldCreateOrphanGap(range('2026-07-13', '2026-07-20'), [], MIN)).toBe(false);
  });
});
