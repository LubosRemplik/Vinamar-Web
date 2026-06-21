import { DomainError } from '../../errors/domain-error';

export class DepositRequiredError extends DomainError {
  readonly status = 422;
  readonly type = 'https://vinamar.example/errors/deposit-required';
  constructor() {
    super('A with-deposit contract requires a deposit amount');
  }
}
