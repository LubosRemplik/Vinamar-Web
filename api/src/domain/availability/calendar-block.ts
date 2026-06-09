import { DateRange } from '../shared/date-range';

export type BlockReason = 'blocked' | 'booked';

export class CalendarBlock {
  constructor(
    public readonly id: string,
    public readonly range: DateRange,
    public readonly reason: BlockReason,
    public readonly createdAt: Date,
  ) {}
}
