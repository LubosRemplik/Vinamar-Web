import { Transporter } from 'nodemailer';
import { EmailAddress } from '../../src/domain/shared/email-address';
import { DateRange } from '../../src/domain/shared/date-range';
import { Inquiry } from '../../src/domain/inquiry/inquiry';
import { SmtpGuestNotifier } from '../../src/infrastructure/notify/smtp-guest-notifier';

const inquiry = () =>
  new Inquiry(
    'id-1',
    'Jan Novák',
    new EmailAddress('jan@x.cz'),
    '',
    new DateRange(new Date('2025-07-14'), new Date('2025-07-25')),
    '',
    'confirmed',
    new Date('2025-06-01'),
  );

const fakeTransport = () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);
  return { transport: { sendMail } as unknown as Transporter, sendMail };
};

describe('SmtpGuestNotifier', () => {
  it('sends booking confirmed to the guest email with HTML + text', async () => {
    const { transport, sendMail } = fakeTransport();
    await new SmtpGuestNotifier(transport).bookingConfirmed(inquiry());
    expect(sendMail).toHaveBeenCalledTimes(1);
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBe('jan@x.cz');
    expect(arg.subject).toContain('potvrzena');
    expect(arg.html).toContain('Jan Novák');
    expect(arg.text).toContain('Jan Novák');
  });

  it('sends arrival reminder to the guest', async () => {
    const { transport, sendMail } = fakeTransport();
    await new SmtpGuestNotifier(transport).arrivalReminder(inquiry());
    expect(sendMail.mock.calls[0][0].to).toBe('jan@x.cz');
    expect(sendMail.mock.calls[0][0].subject).toContain('pobyt');
  });
});
