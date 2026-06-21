import { Contract, CONTRACT_NIGHTS } from '../../src/domain/contract/contract';
import { DateRange } from '../../src/domain/shared/date-range';
import { ContractNightsError } from '../../src/domain/contract/errors/contract-nights.error';
import { DepositRequiredError } from '../../src/domain/contract/errors/deposit-required.error';
import { DepositNotAllowedError } from '../../src/domain/contract/errors/deposit-not-allowed.error';

const base = {
  id: 'c1',
  inquiryId: 'i1',
  guestName: 'Jan Novák',
  guestAddress: 'Václavské náměstí 1, Praha',
  guestIdNumber: '123456',
  guestBirthDate: new Date('1990-01-01'),
  totalPrice: 1000,
  currency: 'EUR',
  now: new Date('2026-01-01'),
};

const range = (nights: number) =>
  new DateRange(new Date('2026-05-01'), new Date(2026, 4, 1 + nights));

describe('Contract', () => {
  it('creates a valid 10-night with-deposit contract', () => {
    const c = Contract.create({
      ...base,
      variant: 'with-deposit',
      range: range(CONTRACT_NIGHTS),
      depositAmount: 200,
      depositDueDate: new Date('2026-04-01'),
    });
    expect(c.range.nights()).toBe(10);
    expect(c.depositAmount).toBe(200);
    expect(c.generatedAt).toEqual(base.now);
  });

  it('creates a valid 10-night without-deposit contract', () => {
    const c = Contract.create({
      ...base,
      variant: 'without-deposit',
      range: range(CONTRACT_NIGHTS),
      depositAmount: null,
      depositDueDate: null,
    });
    expect(c.depositAmount).toBeNull();
  });

  it('rejects a stay that is not exactly 10 nights', () => {
    expect(() =>
      Contract.create({
        ...base,
        variant: 'without-deposit',
        range: range(7),
        depositAmount: null,
        depositDueDate: null,
      }),
    ).toThrow(ContractNightsError);
  });

  it('requires a deposit amount for with-deposit', () => {
    expect(() =>
      Contract.create({
        ...base,
        variant: 'with-deposit',
        range: range(10),
        depositAmount: null,
        depositDueDate: null,
      }),
    ).toThrow(DepositRequiredError);
  });

  it('forbids a deposit amount for without-deposit', () => {
    expect(() =>
      Contract.create({
        ...base,
        variant: 'without-deposit',
        range: range(10),
        depositAmount: 200,
        depositDueDate: null,
      }),
    ).toThrow(DepositNotAllowedError);
  });
});
