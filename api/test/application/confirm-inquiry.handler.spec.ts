import { ConfirmInquiryHandler } from '../../src/application/inquiry/confirm-inquiry.handler';
import { ConfirmInquiryCommand } from '../../src/application/inquiry/confirm-inquiry.command';
import { SubmitInquiryHandler } from '../../src/application/inquiry/submit-inquiry.handler';
import { SubmitInquiryCommand } from '../../src/application/inquiry/submit-inquiry.command';
import { FixedClock, InMemoryAvailability, InMemoryInquiries, SpyNotifier } from '../fakes';

describe('ConfirmInquiryHandler', () => {
  it('confirms an inquiry and blocks its dates as booked', async () => {
    const availability = new InMemoryAvailability();
    const inquiries = new InMemoryInquiries();
    const clock = new FixedClock(new Date('2026-01-01'));
    const submit = new SubmitInquiryHandler(inquiries, availability, new SpyNotifier(), clock, () => 'id-1');
    await submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', ''));

    const confirm = new ConfirmInquiryHandler(inquiries, availability);
    await confirm.execute(new ConfirmInquiryCommand('id-1'));

    expect((await inquiries.get('id-1'))!.status).toBe('confirmed');
    expect(availability.blocks).toHaveLength(1);
    expect(availability.blocks[0].reason).toBe('booked');
  });
});
