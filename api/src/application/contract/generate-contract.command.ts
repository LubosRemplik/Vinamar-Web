import { ContractVariant } from '../../domain/contract/contract-variant';

export class GenerateContractCommand {
  constructor(
    public readonly inquiryId: string,
    public readonly variant: ContractVariant,
    public readonly guestAddress: string,
    public readonly guestIdNumber: string,
    public readonly guestBirthDate: string | null,
    public readonly totalPrice: number,
    public readonly currency: string,
    public readonly depositAmount: number | null,
    public readonly depositDueDate: string | null,
  ) {}
}
