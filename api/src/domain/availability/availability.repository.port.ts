import { CalendarBlock, BlockReason } from './calendar-block';
import { DateRange } from '../shared/date-range';

export const AVAILABILITY_REPOSITORY = Symbol('AvailabilityRepository');

export interface AvailabilityRepository {
  listBetween(from: Date, to: Date): Promise<CalendarBlock[]>;
  findOverlapping(range: DateRange): Promise<CalendarBlock | null>;
  save(range: DateRange, reason: BlockReason): Promise<CalendarBlock>;
  delete(id: string): Promise<void>;
}
