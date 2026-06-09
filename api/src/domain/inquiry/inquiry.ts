import { DateRange } from '../shared/date-range';
import { EmailAddress } from '../shared/email-address';
import { MinimumStayNotMetError } from './minimum-stay-not-met.error';
import { ArrivalInPastError } from './arrival-in-past.error';

export type InquiryStatus = 'pending' | 'confirmed' | 'declined';

export const MINIMUM_NIGHTS = 7;

export class Inquiry {
  constructor(
    public readonly id: string,
    public readonly guestName: string,
    public readonly email: EmailAddress,
    public readonly range: DateRange,
    public readonly message: string,
    public readonly status: InquiryStatus,
    public readonly createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    guestName: string;
    email: EmailAddress;
    range: DateRange;
    message: string;
    now: Date;
  }): Inquiry {
    if (params.range.nights() < MINIMUM_NIGHTS) {
      throw new MinimumStayNotMetError(MINIMUM_NIGHTS);
    }
    if (params.range.arrival.getTime() <= params.now.getTime()) {
      throw new ArrivalInPastError();
    }
    return new Inquiry(
      params.id,
      params.guestName,
      params.email,
      params.range,
      params.message,
      'pending',
      params.now,
    );
  }
}
