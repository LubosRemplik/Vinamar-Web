import { GenerateContractHandler } from '../../src/application/contract/generate-contract.handler';
import { GenerateContractCommand } from '../../src/application/contract/generate-contract.command';
import { SubmitInquiryHandler } from '../../src/application/inquiry/submit-inquiry.handler';
import { SubmitInquiryCommand } from '../../src/application/inquiry/submit-inquiry.command';
import { ConfirmInquiryHandler } from '../../src/application/inquiry/confirm-inquiry.handler';
import { ConfirmInquiryCommand } from '../../src/application/inquiry/confirm-inquiry.command';
import {
  FixedClock,
  InMemoryAvailability,
  InMemoryInquiries,
  SpyNotifier,
  InMemoryContracts,
  SpyContractRenderer,
  SpyContractNotifier,
} from '../fakes';
import { InquiryNotConfirmedError } from '../../src/domain/contract/errors/inquiry-not-confirmed.error';
import { ContractAlreadySentError } from '../../src/domain/contract/errors/contract-already-sent.error';

function setup() {
  const availability = new InMemoryAvailability();
  const inquiries = new InMemoryInquiries();
  const contracts = new InMemoryContracts();
  const renderer = new SpyContractRenderer();
  const notifier = new SpyContractNotifier();
  const clock = new FixedClock(new Date('2026-01-01'));
  const submit = new SubmitInquiryHandler(
    inquiries,
    availability,
    new SpyNotifier(),
    clock,
    () => 'i1',
  );
  const handler = new GenerateContractHandler(
    inquiries,
    contracts,
    renderer,
    notifier,
    clock,
    () => 'c1',
  );
  return { availability, inquiries, contracts, renderer, notifier, submit, handler };
}

const command = () =>
  new GenerateContractCommand('i1', 'without-deposit', 'Praha 1', 'OP123', null, 1000, 'EUR', null, null);

describe('GenerateContractHandler', () => {
  it('generates, sends and moves the inquiry to contract_sent (always 10 nights)', async () => {
    const s = setup();
    // A 7-night inquiry — the contract must still span exactly 10 nights.
    await s.submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', ''));
    await new ConfirmInquiryHandler(s.inquiries, s.availability).execute(new ConfirmInquiryCommand('i1'));

    const result = await s.handler.execute(command());

    expect(result.id).toBe('c1');
    const saved = s.contracts.items[0];
    expect(saved.contract.range.nights()).toBe(10);
    expect(saved.sentAt).not.toBeNull();
    expect(s.renderer.rendered).toHaveLength(1);
    expect(s.notifier.sent).toHaveLength(1);
    expect(s.notifier.sent[0].email).toBe('jan@x.cz');
    expect((await s.inquiries.get('i1'))!.status).toBe('contract_sent');
  });

  it('refuses to generate for a non-confirmed inquiry', async () => {
    const s = setup();
    await s.submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', ''));

    await expect(s.handler.execute(command())).rejects.toBeInstanceOf(InquiryNotConfirmedError);
  });

  it('refuses to generate a second contract for the same inquiry', async () => {
    const s = setup();
    await s.submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', ''));
    await new ConfirmInquiryHandler(s.inquiries, s.availability).execute(new ConfirmInquiryCommand('i1'));
    await s.handler.execute(command());

    await expect(s.handler.execute(command())).rejects.toBeInstanceOf(ContractAlreadySentError);
  });
});
