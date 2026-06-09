import { DateRange } from '../../src/domain/shared/date-range';

describe('DateRange', () => {
  it('counts nights between arrival and departure', () => {
    const r = new DateRange(new Date('2026-05-01'), new Date('2026-05-08'));
    expect(r.nights()).toBe(7);
  });

  it('rejects a departure on or before arrival', () => {
    expect(() => new DateRange(new Date('2026-05-08'), new Date('2026-05-01'))).toThrow();
  });

  it('detects overlap', () => {
    const a = new DateRange(new Date('2026-05-01'), new Date('2026-05-08'));
    const b = new DateRange(new Date('2026-05-07'), new Date('2026-05-10'));
    const c = new DateRange(new Date('2026-05-08'), new Date('2026-05-12'));
    expect(a.overlaps(b)).toBe(true);
    expect(a.overlaps(c)).toBe(false);
  });
});
