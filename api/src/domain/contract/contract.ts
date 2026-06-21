import { DateRange } from '../shared/date-range';
import { ContractVariant } from './contract-variant';
import { ContractNightsError } from './errors/contract-nights.error';
import { DepositRequiredError } from './errors/deposit-required.error';
import { DepositNotAllowedError } from './errors/deposit-not-allowed.error';

export const CONTRACT_NIGHTS = 10;

export class Contract {
  constructor(
    public readonly id: string,
    public readonly inquiryId: string,
    public readonly variant: ContractVariant,
    public readonly guestName: string,
    public readonly guestAddress: string,
    public readonly guestIdNumber: string,
    public readonly guestBirthDate: Date | null,
    public readonly range: DateRange,
    public readonly totalPrice: number,
    public readonly currency: string,
    public readonly depositAmount: number | null,
    public readonly depositDueDate: Date | null,
    public readonly generatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    inquiryId: string;
    variant: ContractVariant;
    guestName: string;
    guestAddress: string;
    guestIdNumber: string;
    guestBirthDate: Date | null;
    range: DateRange;
    totalPrice: number;
    currency: string;
    depositAmount: number | null;
    depositDueDate: Date | null;
    now: Date;
  }): Contract {
    if (params.range.nights() !== CONTRACT_NIGHTS) {
      throw new ContractNightsError();
    }
    if (params.variant === 'with-deposit' && params.depositAmount == null) {
      throw new DepositRequiredError();
    }
    if (params.variant === 'without-deposit' && params.depositAmount != null) {
      throw new DepositNotAllowedError();
    }
    return new Contract(
      params.id,
      params.inquiryId,
      params.variant,
      params.guestName,
      params.guestAddress,
      params.guestIdNumber,
      params.guestBirthDate,
      params.range,
      params.totalPrice,
      params.currency,
      params.depositAmount,
      params.depositDueDate,
      params.now,
    );
  }
}
