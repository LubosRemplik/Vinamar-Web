import { Inquiry } from './inquiry';

export const GUEST_NOTIFIER = Symbol('GuestNotifier');

export interface GuestNotifier {
  inquiryReceived(inquiry: Inquiry): Promise<void>;
  bookingConfirmed(inquiry: Inquiry): Promise<void>;
  inquiryDeclined(inquiry: Inquiry): Promise<void>;
  bookingCancelled(inquiry: Inquiry): Promise<void>;
  arrivalReminder(inquiry: Inquiry): Promise<void>;
}
