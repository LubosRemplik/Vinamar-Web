import { Inquiry } from '../../src/domain/inquiry/inquiry';
import { EmailAddress } from '../../src/domain/shared/email-address';
import { DateRange } from '../../src/domain/shared/date-range';

const base = {
  id: 'i1',
  guestName: 'Jan',
  email: new EmailAddress('jan@x.cz'),
  phone: '',
  message: '',
  now: new Date('2026-01-01'),
};

describe('Inquiry.createByAdmin', () => {
  it('allows a stay shorter than the minimum and starts confirmed', () => {
    const range = new DateRange(new Date('2026-05-01'), new Date('2026-05-03'));
    const inq = Inquiry.createByAdmin({ ...base, range });
    expect(inq.status).toBe('confirmed');
  });

  it('allows arrival in the past', () => {
    const range = new DateRange(new Date('2025-01-01'), new Date('2025-01-08'));
    expect(() => Inquiry.createByAdmin({ ...base, range })).not.toThrow();
  });
});

describe('Inquiry.create', () => {
  it('still rejects a stay shorter than the minimum', () => {
    const range = new DateRange(new Date('2026-05-01'), new Date('2026-05-03'));
    expect(() => Inquiry.create({ ...base, range })).toThrow();
  });
});
