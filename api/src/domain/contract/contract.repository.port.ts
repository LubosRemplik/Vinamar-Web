import { Contract } from './contract';

export const CONTRACT_REPOSITORY = Symbol('ContractRepository');

export interface ContractRepository {
  save(contract: Contract, pdf: Buffer): Promise<void>;
  markSent(id: string, sentAt: Date): Promise<void>;
  get(id: string): Promise<{ contract: Contract; pdf: Buffer } | null>;
  existsForInquiry(inquiryId: string): Promise<boolean>;
}
