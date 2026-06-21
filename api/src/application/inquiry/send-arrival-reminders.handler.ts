import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SendArrivalRemindersCommand } from './send-arrival-reminders.command';
import { INQUIRY_REPOSITORY, InquiryRepository } from '../../domain/inquiry/inquiry.repository.port';
import { GUEST_NOTIFIER, GuestNotifier } from '../../domain/inquiry/guest-notifier.port';
import { CLOCK, Clock } from '../../domain/shared/clock.port';

@CommandHandler(SendArrivalRemindersCommand)
export class SendArrivalRemindersHandler implements ICommandHandler<SendArrivalRemindersCommand> {
  private readonly logger = new Logger(SendArrivalRemindersHandler.name);
  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(GUEST_NOTIFIER) private readonly guest: GuestNotifier,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(_command: SendArrivalRemindersCommand): Promise<void> {
    const due = await this.inquiries.listDueForArrivalReminder(this.clock.now());
    for (const inquiry of due) {
      try {
        await this.guest.arrivalReminder(inquiry);
        await this.inquiries.markArrivalReminderSent(inquiry.id);
      } catch (err) {
        // Leave unmarked so the next daily run retries.
        this.logger.warn(`arrival reminder failed for inquiry ${inquiry.id}: ${String(err)}`);
      }
    }
  }
}
