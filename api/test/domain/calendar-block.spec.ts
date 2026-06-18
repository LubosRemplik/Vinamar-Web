import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { DateRange } from '../../src/domain/shared/date-range';

const range = new DateRange(new Date('2026-05-01'), new Date('2026-05-08'));

describe('CalendarBlock', () => {
  it('defaults note and inquiryId to null', () => {
    const b = new CalendarBlock('b1', range, 'booked', new Date());
    expect(b.note).toBeNull();
    expect(b.inquiryId).toBeNull();
  });

  it('carries note and inquiryId when provided', () => {
    const b = new CalendarBlock('b1', range, 'booked', new Date(), 'vlastní pobyt', 'i1');
    expect(b.note).toBe('vlastní pobyt');
    expect(b.inquiryId).toBe('i1');
  });
});
