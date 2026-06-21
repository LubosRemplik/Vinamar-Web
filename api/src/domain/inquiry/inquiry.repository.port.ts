import { Inquiry, InquiryStatus } from './inquiry';

export const INQUIRY_REPOSITORY = Symbol('InquiryRepository');

export interface InquiryRepository {
  save(inquiry: Inquiry): Promise<void>;
  get(id: string): Promise<Inquiry | null>;
  list(): Promise<Inquiry[]>;
  updateStatus(id: string, status: InquiryStatus): Promise<void>;
  updateContact(id: string, guestName: string, email: string, phone: string): Promise<void>;
  listDueForArrivalReminder(now: Date): Promise<Inquiry[]>;
  markArrivalReminderSent(id: string): Promise<void>;
}
