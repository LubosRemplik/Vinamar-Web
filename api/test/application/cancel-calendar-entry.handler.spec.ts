import { CancelCalendarEntryHandler } from '../../src/application/availability/cancel-calendar-entry.handler';
import { CancelCalendarEntryCommand } from '../../src/application/availability/cancel-calendar-entry.command';
import { SubmitInquiryHandler } from '../../src/application/inquiry/submit-inquiry.handler';
import { SubmitInquiryCommand } from '../../src/application/inquiry/submit-inquiry.command';
import { DateRange } from '../../src/domain/shared/date-range';
import { FixedClock, InMemoryAvailability, InMemoryInquiries, SpyNotifier, SpyGuestNotifier } from '../fakes';

describe('CancelCalendarEntryHandler', () => {
  it('frees the term and marks the linked inquiry cancelled', async () => {
    const availability = new InMemoryAvailability();
    const inquiries = new InMemoryInquiries();
    const submit = new SubmitInquiryHandler(
      inquiries,
      availability,
      new SpyNotifier(),
      new SpyGuestNotifier(),
      new FixedClock(new Date('2026-01-01')),
      () => 'id-1',
    );
    await submit.execute(
      new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', '', '', true),
    );
    const blockId = availability.blocks[0].id;

    const guest = new SpyGuestNotifier();
    const owner = new SpyNotifier();
    const cancel = new CancelCalendarEntryHandler(availability, inquiries, guest, owner);
    await cancel.execute(new CancelCalendarEntryCommand(blockId));

    expect(availability.blocks).toHaveLength(0);
    expect((await inquiries.get('id-1'))!.status).toBe('cancelled');
    expect(guest.received).toEqual([{ method: 'bookingCancelled', id: 'id-1' }]);
    expect(owner.cancelled.map((i) => i.id)).toEqual(['id-1']);
  });

  it('cancels an entry with no linked inquiry without touching any inquiry', async () => {
    const availability = new InMemoryAvailability();
    const inquiries = new InMemoryInquiries();
    const block = await availability.save(
      new DateRange(new Date('2026-06-01'), new Date('2026-06-08')),
      'booked',
    );

    const cancel = new CancelCalendarEntryHandler(availability, inquiries, new SpyGuestNotifier(), new SpyNotifier());
    await cancel.execute(new CancelCalendarEntryCommand(block.id));

    expect(availability.blocks).toHaveLength(0);
  });
});
