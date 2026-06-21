import { GetContractPdfHandler } from '../../src/application/contract/get-contract-pdf.handler';
import { GetContractPdfQuery } from '../../src/application/contract/get-contract-pdf.query';
import { Contract } from '../../src/domain/contract/contract';
import { DateRange } from '../../src/domain/shared/date-range';
import { InMemoryContracts } from '../fakes';

const contract = () =>
  Contract.create({
    id: 'c1',
    inquiryId: 'i1',
    variant: 'without-deposit',
    guestName: 'Jan',
    guestAddress: 'Praha',
    guestIdNumber: 'OP1',
    guestBirthDate: null,
    range: new DateRange(new Date('2026-05-01'), new Date('2026-05-11')),
    totalPrice: 1000,
    currency: 'EUR',
    depositAmount: null,
    depositDueDate: null,
    now: new Date('2026-01-01'),
  });

describe('GetContractPdfHandler', () => {
  it('returns the stored pdf buffer for a known id', async () => {
    const contracts = new InMemoryContracts();
    const pdf = Buffer.from('%PDF-data');
    await contracts.save(contract(), pdf);
    const handler = new GetContractPdfHandler(contracts);

    const result = await handler.execute(new GetContractPdfQuery('c1'));

    expect(result).toEqual(pdf);
  });

  it('returns null for an unknown id', async () => {
    const handler = new GetContractPdfHandler(new InMemoryContracts());
    expect(await handler.execute(new GetContractPdfQuery('nope'))).toBeNull();
  });
});
