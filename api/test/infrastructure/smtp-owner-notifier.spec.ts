import { Transporter } from 'nodemailer';
import { EmailAddress } from '../../src/domain/shared/email-address';
import { DateRange } from '../../src/domain/shared/date-range';
import { Inquiry } from '../../src/domain/inquiry/inquiry';
import { SmtpOwnerNotifier } from '../../src/infrastructure/notify/smtp-owner-notifier';

const inquiry = () =>
  new Inquiry(
    'id-1',
    'Jan Novák',
    new EmailAddress('jan@x.cz'),
    '',
    new DateRange(new Date('2025-07-14'), new Date('2025-07-25')),
    '',
    'pending',
    new Date('2025-06-01'),
  );

const fakeTransport = () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);
  return { transport: { sendMail } as unknown as Transporter, sendMail };
};

describe('SmtpOwnerNotifier', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.MAIL_REPLY_TO;
  });

  afterAll(() => {
    process.env = env;
  });

  it('sends the inquiry notification to the owner', async () => {
    const { transport, sendMail } = fakeTransport();
    await new SmtpOwnerNotifier(transport).inquiryReceived(inquiry());
    expect(sendMail).toHaveBeenCalledTimes(1);
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBe(process.env.OWNER_EMAIL ?? 'owner@example.com');
    expect(arg.replyTo).toBeUndefined();
  });

  it('sets Reply-To from MAIL_REPLY_TO when configured', async () => {
    process.env.MAIL_REPLY_TO = 'remplik@gmail.com';
    const { transport, sendMail } = fakeTransport();
    await new SmtpOwnerNotifier(transport).inquiryReceived(inquiry());
    expect(sendMail.mock.calls[0][0].replyTo).toBe('remplik@gmail.com');
  });
});
