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
  ownerInquiryReceivedEmail,
  contractEmail,
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

  it('ownerInquiryReceived is HTML with contact, dates and message', () => {
    const m = ownerInquiryReceivedEmail(inquiry());
    expect(m.html).toContain('<!doctype html>');
    expect(m.html).toContain('Jan Novák');
    expect(m.html).toContain('jan@x.cz');
    expect(m.html).toContain('+420777111222');
    expect(m.html).toContain('14. 7. 2025');
    expect(m.html).toContain('ahoj');
    expect(m.subject).toContain('Jan Novák');
  });

  it('contractEmail is HTML addressed to the guest', () => {
    const m = contractEmail('Jan Novák');
    expect(m.html).toContain('<!doctype html>');
    expect(m.html).toContain('Jan Novák');
    expect(m.subject.toLowerCase()).toContain('smlouva');
    expect(m.text).toContain('Jan Novák');
  });

  it('ownerInquiryReceived escapes the guest message and contact', () => {
    const evil = new Inquiry(
      'id-y',
      'Jan',
      new EmailAddress('e@x.cz'),
      '',
      new DateRange(new Date('2025-07-14'), new Date('2025-07-25')),
      '<img src=x onerror=alert(1)>',
      'confirmed',
      new Date('2025-06-01'),
    );
    const m = ownerInquiryReceivedEmail(evil);
    expect(m.html).not.toContain('<img src=x');
    expect(m.html).toContain('&lt;img');
  });

  it('escapes HTML in guest name to prevent injection', () => {
    const evil = new Inquiry(
      'id-x',
      '<script>alert(1)</script>',
      new EmailAddress('e@x.cz'),
      '',
      new DateRange(new Date('2025-07-14'), new Date('2025-07-25')),
      '',
      'confirmed',
      new Date('2025-06-01'),
    );
    const m = inquiryReceivedEmail(evil);
    expect(m.html).not.toContain('<script>alert(1)</script>');
    expect(m.html).toContain('&lt;script&gt;');
    expect(bookingCancelledEmail(evil, { isOwner: true }).html).not.toContain('<script>alert(1)</script>');
  });
});
