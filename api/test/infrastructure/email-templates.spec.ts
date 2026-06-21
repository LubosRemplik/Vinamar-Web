import { EmailAddress } from '../../src/domain/shared/email-address';
import { DateRange } from '../../src/domain/shared/date-range';
import { Inquiry } from '../../src/domain/inquiry/inquiry';
import {
  formatCzechDate,
  inquiryReceivedEmail,
  bookingConfirmedEmail,
  inquiryDeclinedEmail,
  bookingCancelledEmail,
  arrivalReminderEmail,
} from '../../src/infrastructure/notify/templates/messages';

const inquiry = () =>
  new Inquiry(
    'id-1',
    'Jan Novák',
    new EmailAddress('jan@x.cz'),
    '+420777111222',
    new DateRange(new Date('2025-07-14'), new Date('2025-07-25')),
    'ahoj',
    'confirmed',
    new Date('2025-06-01'),
  );

describe('formatCzechDate', () => {
  it('formats as Czech D. M. YYYY in UTC', () => {
    expect(formatCzechDate(new Date('2025-07-14'))).toBe('14. 7. 2025');
  });
});

describe('email templates', () => {
  it('inquiryReceived: subject + greeting + stay dates in HTML, plus text fallback', () => {
    const m = inquiryReceivedEmail(inquiry());
    expect(m.subject).toContain('poptávku');
    expect(m.html).toContain('Jan Novák');
    expect(m.html).toContain('14. 7. 2025');
    expect(m.html).toContain('25. 7. 2025');
    expect(m.html).toContain('<!doctype html>');
    expect(m.text).toContain('Jan Novák');
  });

  it('bookingConfirmed mentions confirmation', () => {
    expect(bookingConfirmedEmail(inquiry()).subject.toLowerCase()).toContain('potvrzena');
  });

  it('inquiryDeclined is polite and mentions the term', () => {
    expect(inquiryDeclinedEmail(inquiry()).html).toContain('14. 7. 2025');
  });

  it('bookingCancelled has distinct guest vs owner subject', () => {
    const guest = bookingCancelledEmail(inquiry(), { isOwner: false });
    const owner = bookingCancelledEmail(inquiry(), { isOwner: true });
    expect(guest.subject).not.toBe(owner.subject);
    expect(owner.html).toContain('Jan Novák');
  });

  it('arrivalReminder is minimal and mentions the upcoming stay', () => {
    expect(arrivalReminderEmail(inquiry()).html).toContain('14. 7. 2025');
  });
});
