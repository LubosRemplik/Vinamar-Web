import { DomainError } from '../../errors/domain-error';

export class InquiryNotConfirmedError extends DomainError {
  readonly status = 409;
  readonly type = 'https://vinamar.example/errors/inquiry-not-confirmed';
  constructor() {
    super('A contract can only be generated for a confirmed reservation');
  }
}
