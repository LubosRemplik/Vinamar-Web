import { CalendarBlock, BlockReason } from './calendar-block';
import { DateRange } from '../shared/date-range';

export const AVAILABILITY_REPOSITORY = Symbol('AvailabilityRepository');

export interface SaveOptions {
  inquiryId?: string;
  note?: string;
}

export interface CalendarEntryView {
  id: string;
  start: string;
  end: string;
  reason: BlockReason;
  note: string | null;
  inquiryId: string | null;
  guestName: string | null;
  email: string | null;
  phone: string | null;
}

export interface AvailabilityRepository {
  listBetween(from: Date, to: Date): Promise<CalendarBlock[]>;
  findOverlapping(range: DateRange): Promise<CalendarBlock | null>;
  save(range: DateRange, reason: BlockReason, opts?: SaveOptions): Promise<CalendarBlock>;
  delete(id: string): Promise<{ inquiryId: string | null }>;
  listEntries(): Promise<CalendarEntryView[]>;
}
