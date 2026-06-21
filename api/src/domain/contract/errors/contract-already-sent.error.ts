import { DomainError } from '../../errors/domain-error';

export class ContractAlreadySentError extends DomainError {
  readonly status = 409;
  readonly type = 'https://vinamar.example/errors/contract-already-sent';
  constructor() {
    super('A contract has already been generated for this reservation');
  }
}
