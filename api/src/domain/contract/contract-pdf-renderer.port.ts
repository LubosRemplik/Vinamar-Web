import { Contract } from './contract';

export const CONTRACT_PDF_RENDERER = Symbol('ContractPdfRenderer');

export interface ContractPdfRenderer {
  render(contract: Contract): Promise<Buffer>;
}
