import { DomainError } from '../errors/domain-error';

export class ArrivalInPastError extends DomainError {
  readonly status = 422;
  readonly type = 'https://vinamar.example/errors/arrival-in-past';
  constructor() {
    super('Arrival date must be in the future');
  }
}
