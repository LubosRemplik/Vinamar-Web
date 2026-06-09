import { SubmitInquiryHandler } from '../../src/application/inquiry/submit-inquiry.handler';
import { SubmitInquiryCommand } from '../../src/application/inquiry/submit-inquiry.command';
import { DatesUnavailableError } from '../../src/domain/availability/dates-unavailable.error';
import { MinimumStayNotMetError } from '../../src/domain/inquiry/minimum-stay-not-met.error';
import { DateRange } from '../../src/domain/shared/date-range';
import { FixedClock, InMemoryAvailability, InMemoryInquiries, SpyNotifier } from '../fakes';

const make = () => {
  const availability = new InMemoryAvailability();
  const inquiries = new InMemoryInquiries();
  const notifier = new SpyNotifier();
  const clock = new FixedClock(new Date('2026-01-01'));
  const handler = new SubmitInquiryHandler(inquiries, availability, notifier, clock, () => 'id-1');
  return { handler, availability, inquiries, notifier };
};

const validCmd = () =>
  new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', 'ahoj');

describe('SubmitInquiryHandler', () => {
  it('persists a pending inquiry and notifies the owner', async () => {
    const { handler, inquiries, notifier } = make();
    await handler.execute(validCmd());
    expect(inquiries.items).toHaveLength(1);
    expect(inquiries.items[0].status).toBe('pending');
    expect(notifier.received).toHaveLength(1);
  });

  it('rejects a stay shorter than 7 nights', async () => {
    const { handler } = make();
    const cmd = new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-04', '');
    await expect(handler.execute(cmd)).rejects.toBeInstanceOf(MinimumStayNotMetError);
  });

  it('rejects dates overlapping an existing block', async () => {
    const { handler, availability } = make();
    await availability.save(new DateRange(new Date('2026-05-03'), new Date('2026-05-10')), 'blocked');
    await expect(handler.execute(validCmd())).rejects.toBeInstanceOf(DatesUnavailableError);
  });
});
