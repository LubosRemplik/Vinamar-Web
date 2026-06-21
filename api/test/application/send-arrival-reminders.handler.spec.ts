import { SendArrivalRemindersHandler } from '../../src/application/inquiry/send-arrival-reminders.handler';
import { SendArrivalRemindersCommand } from '../../src/application/inquiry/send-arrival-reminders.command';
import { EmailAddress } from '../../src/domain/shared/email-address';
import { DateRange } from '../../src/domain/shared/date-range';
import { Inquiry, InquiryStatus } from '../../src/domain/inquiry/inquiry';
import { FixedClock, InMemoryInquiries, SpyGuestNotifier } from '../fakes';

const NOW = new Date('2026-01-01T00:00:00Z');
const at = (status: InquiryStatus, id: string, arrivalDaysFromNow: number) =>
  new Inquiry(
    id,
    'Host',
    new EmailAddress(`${id}@x.cz`),
    '',
    new DateRange(
      new Date(NOW.getTime() + arrivalDaysFromNow * 86400000),
      new Date(NOW.getTime() + (arrivalDaysFromNow + 7) * 86400000),
    ),
    '',
    status,
    NOW,
  );

const make = async (seed: Inquiry[]) => {
  const inquiries = new InMemoryInquiries();
  for (const i of seed) await inquiries.save(i);
  const guest = new SpyGuestNotifier();
  const handler = new SendArrivalRemindersHandler(inquiries, guest, new FixedClock(NOW));
  return { inquiries, guest, handler };
};

describe('SendArrivalRemindersHandler', () => {
  it('reminds confirmed stays arriving within 14 days, once', async () => {
    const { guest, handler, inquiries } = await make([
      at('confirmed', 'soon', 10), // within window
      at('confirmed', 'edge', 14), // inclusive edge
      at('confirmed', 'far', 20), // outside window
      at('pending', 'pending', 10), // not confirmed
      at('confirmed', 'past', -1), // already arrived
    ]);

    await handler.execute(new SendArrivalRemindersCommand());

    const reminded = guest.received.filter((r) => r.method === 'arrivalReminder').map((r) => r.id).sort();
    expect(reminded).toEqual(['edge', 'soon']);
    expect(inquiries.reminderSent.has('soon')).toBe(true);

    // second run is idempotent — no duplicate reminders
    guest.received = [];
    await handler.execute(new SendArrivalRemindersCommand());
    expect(guest.received).toHaveLength(0);
  });

  it('leaves the inquiry unmarked when sending fails, so it retries next run', async () => {
    const { handler, inquiries, guest } = await make([at('confirmed', 'soon', 10)]);
    guest.arrivalReminder = async () => {
      throw new Error('smtp down');
    };
    await handler.execute(new SendArrivalRemindersCommand());
    expect(inquiries.reminderSent.has('soon')).toBe(false);
  });
});
