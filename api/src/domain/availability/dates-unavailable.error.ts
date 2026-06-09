import { DomainError } from '../errors/domain-error';

export class DatesUnavailableError extends DomainError {
  readonly status = 409;
  readonly type = 'https://vinamar.example/errors/dates-unavailable';
  constructor() {
    super('The requested dates are not available');
  }
}
