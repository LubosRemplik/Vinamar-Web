import { ConfirmInquiryHandler } from '../../src/application/inquiry/confirm-inquiry.handler';
import { ConfirmInquiryCommand } from '../../src/application/inquiry/confirm-inquiry.command';
import { SubmitInquiryHandler } from '../../src/application/inquiry/submit-inquiry.handler';
import { SubmitInquiryCommand } from '../../src/application/inquiry/submit-inquiry.command';
import { FixedClock, InMemoryAvailability, InMemoryInquiries, SpyNotifier, SpyGuestNotifier } from '../fakes';

describe('ConfirmInquiryHandler', () => {
  it('confirms an inquiry and blocks its dates as booked', async () => {
    const availability = new InMemoryAvailability();
    const inquiries = new InMemoryInquiries();
    const clock = new FixedClock(new Date('2026-01-01'));
    const submit = new SubmitInquiryHandler(inquiries, availability, new SpyNotifier(), new SpyGuestNotifier(), clock, () => 'id-1');
    await submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', ''));

    const guest = new SpyGuestNotifier();
    const confirm = new ConfirmInquiryHandler(inquiries, availability, guest);
    await confirm.execute(new ConfirmInquiryCommand('id-1'));

    expect((await inquiries.get('id-1'))!.status).toBe('confirmed');
    expect(availability.blocks).toHaveLength(1);
    expect(availability.blocks[0].reason).toBe('booked');
    expect(availability.blocks[0].inquiryId).toBe('id-1');
  });

  it('auto-declines other pending inquiries that conflict with the confirmed range', async () => {
    const availability = new InMemoryAvailability();
    const inquiries = new InMemoryInquiries();
    const clock = new FixedClock(new Date('2026-01-01'));
    const notifier = new SpyNotifier();
    const guest = new SpyGuestNotifier();

    const submitWith = (id: string, arrival: string, departure: string) =>
      new SubmitInquiryHandler(inquiries, availability, notifier, guest, clock, () => id).execute(
        new SubmitInquiryCommand('Host', `${id}@x.cz`, arrival, departure, ''),
      );

    await submitWith('winner', '2026-05-01', '2026-05-08');
    await submitWith('overlap', '2026-05-05', '2026-05-12'); // conflicts
    await submitWith('adjacent', '2026-05-08', '2026-05-15'); // turnover, no conflict
    await submitWith('far', '2026-06-01', '2026-06-08'); // unrelated

    await new ConfirmInquiryHandler(inquiries, availability, guest).execute(
      new ConfirmInquiryCommand('winner'),
    );

    expect((await inquiries.get('winner'))!.status).toBe('confirmed');
    expect((await inquiries.get('overlap'))!.status).toBe('declined');
    expect((await inquiries.get('adjacent'))!.status).toBe('pending');
    expect((await inquiries.get('far'))!.status).toBe('pending');
    expect(guest.received).toContainEqual({ method: 'bookingConfirmed', id: 'winner' });
    expect(guest.received).toContainEqual({ method: 'inquiryDeclined', id: 'overlap' });
    expect(guest.received.filter((r) => r.method === 'inquiryDeclined')).toHaveLength(1);
  });
});
