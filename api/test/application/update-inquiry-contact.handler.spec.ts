import { UpdateInquiryContactHandler } from '../../src/application/inquiry/update-inquiry-contact.handler';
import { UpdateInquiryContactCommand } from '../../src/application/inquiry/update-inquiry-contact.command';
import { Inquiry } from '../../src/domain/inquiry/inquiry';
import { EmailAddress } from '../../src/domain/shared/email-address';
import { DateRange } from '../../src/domain/shared/date-range';
import { InMemoryInquiries } from '../fakes';

const seed = (inquiries: InMemoryInquiries) =>
  inquiries.items.push(
    new Inquiry(
      'id-1',
      'Jan',
      new EmailAddress('jan@x.cz'),
      '+420111',
      new DateRange(new Date('2026-05-01'), new Date('2026-05-08')),
      'ahoj',
      'confirmed',
      new Date('2026-01-01'),
    ),
  );

describe('UpdateInquiryContactHandler', () => {
  it('updates guest name, email and phone, keeping status and range', async () => {
    const inquiries = new InMemoryInquiries();
    seed(inquiries);
    const handler = new UpdateInquiryContactHandler(inquiries);

    await handler.execute(new UpdateInquiryContactCommand('id-1', 'Jana', 'jana@x.cz', '+420222'));

    const updated = await inquiries.get('id-1');
    expect(updated!.guestName).toBe('Jana');
    expect(updated!.email.value).toBe('jana@x.cz');
    expect(updated!.phone).toBe('+420222');
    expect(updated!.status).toBe('confirmed');
  });

  it('throws when the inquiry does not exist', async () => {
    const handler = new UpdateInquiryContactHandler(new InMemoryInquiries());
    await expect(
      handler.execute(new UpdateInquiryContactCommand('missing', 'X', 'x@x.cz', '')),
    ).rejects.toThrow();
  });
});
