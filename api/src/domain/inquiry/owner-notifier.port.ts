import { Inquiry } from './inquiry';

export const OWNER_NOTIFIER = Symbol('OwnerNotifier');

export interface OwnerNotifier {
  inquiryReceived(inquiry: Inquiry): Promise<void>;
  bookingCancelled(inquiry: Inquiry): Promise<void>;
}
