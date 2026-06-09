import { DomainError } from '../errors/domain-error';

export class DatabaseUnavailableError extends DomainError {
  readonly status = 503;
  readonly type = 'https://vinamar.example/errors/database-unavailable';

  constructor() {
    super('Database is not reachable');
  }
}
