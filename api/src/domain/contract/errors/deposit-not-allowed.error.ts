import { DomainError } from '../../errors/domain-error';

export class DepositNotAllowedError extends DomainError {
  readonly status = 422;
  readonly type = 'https://vinamar.example/errors/deposit-not-allowed';
  constructor() {
    super('A without-deposit contract must not carry a deposit amount');
  }
}
