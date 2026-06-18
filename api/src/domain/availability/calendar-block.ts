import { DateRange } from '../shared/date-range';

// Every calendar entry represents a booking; manual "blocks" were removed — to
// reserve dates for yourself, create a reservation. Kept as a type alias so the
// repository/save signatures stay expressive.
export type BlockReason = 'booked';

export class CalendarBlock {
  constructor(
    public readonly id: string,
    public readonly range: DateRange,
    public readonly reason: BlockReason,
    public readonly createdAt: Date,
    public readonly note: string | null = null,
    public readonly inquiryId: string | null = null,
  ) {}
}
