import { DomainError } from '../errors/domain-error';

export class MinimumStayNotMetError extends DomainError {
  readonly status = 422;
  readonly type = 'https://vinamar.example/errors/minimum-stay';
  constructor(public readonly minimumNights: number) {
    super(`Minimum stay is ${minimumNights} nights`);
  }
}
