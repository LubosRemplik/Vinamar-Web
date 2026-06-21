import { Contract } from './contract';

export const CONTRACT_NOTIFIER = Symbol('ContractNotifier');

export interface ContractNotifier {
  sendToGuest(contract: Contract, guestEmail: string, pdf: Buffer): Promise<void>;
}
