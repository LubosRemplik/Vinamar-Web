import { PdfmakeContractRenderer } from '../../src/infrastructure/pdf/pdfmake-contract-renderer';
import { Contract } from '../../src/domain/contract/contract';
import { ContractVariant } from '../../src/domain/contract/contract-variant';
import { DateRange } from '../../src/domain/shared/date-range';

const make = (variant: ContractVariant) =>
  Contract.create({
    id: 'c1',
    inquiryId: 'i1',
    variant,
    guestName: 'Jan Novák',
    guestAddress: 'Václavské náměstí 1, Praha',
    guestIdNumber: 'OP123456',
    guestBirthDate: new Date('1990-01-01'),
    range: new DateRange(new Date('2026-05-01'), new Date('2026-05-11')),
    totalPrice: 1000,
    currency: 'EUR',
    depositAmount: variant === 'with-deposit' ? 200 : null,
    depositDueDate: variant === 'with-deposit' ? new Date('2026-04-01') : null,
    now: new Date('2026-01-01'),
  });

describe('PdfmakeContractRenderer', () => {
  const renderer = new PdfmakeContractRenderer();

  it('renders a with-deposit PDF buffer', async () => {
    const pdf = await renderer.render(make('with-deposit'));
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders a without-deposit PDF buffer', async () => {
    const pdf = await renderer.render(make('without-deposit'));
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
