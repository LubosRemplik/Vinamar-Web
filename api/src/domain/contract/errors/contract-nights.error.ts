import { DomainError } from '../../errors/domain-error';
import { CONTRACT_NIGHTS } from '../contract';

export class ContractNightsError extends DomainError {
  readonly status = 422;
  readonly type = 'https://vinamar.example/errors/contract-nights';
  constructor() {
    super(`A contract must cover exactly ${CONTRACT_NIGHTS} nights`);
  }
}
