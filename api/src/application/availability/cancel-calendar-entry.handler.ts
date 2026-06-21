import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelCalendarEntryCommand } from './cancel-calendar-entry.command';
import { AVAILABILITY_REPOSITORY, AvailabilityRepository } from '../../domain/availability/availability.repository.port';
import { INQUIRY_REPOSITORY, InquiryRepository } from '../../domain/inquiry/inquiry.repository.port';
import { GUEST_NOTIFIER, GuestNotifier } from '../../domain/inquiry/guest-notifier.port';
import { OWNER_NOTIFIER, OwnerNotifier } from '../../domain/inquiry/owner-notifier.port';

@CommandHandler(CancelCalendarEntryCommand)
export class CancelCalendarEntryHandler implements ICommandHandler<CancelCalendarEntryCommand> {
  private readonly logger = new Logger(CancelCalendarEntryHandler.name);
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(GUEST_NOTIFIER) private readonly guest: GuestNotifier,
    @Inject(OWNER_NOTIFIER) private readonly owner: OwnerNotifier,
  ) {}

  async execute(cmd: CancelCalendarEntryCommand): Promise<void> {
    const { inquiryId } = await this.availability.delete(cmd.id);
    if (!inquiryId) {
      return;
    }
    await this.inquiries.updateStatus(inquiryId, 'cancelled');
    const inquiry = await this.inquiries.get(inquiryId);
    if (!inquiry) {
      return;
    }
    try {
      await this.guest.bookingCancelled(inquiry);
    } catch (err) {
      this.logger.warn(`guest cancellation notification failed for inquiry ${inquiryId}: ${String(err)}`);
    }
    try {
      await this.owner.bookingCancelled(inquiry);
    } catch (err) {
      this.logger.warn(`owner cancellation notification failed for inquiry ${inquiryId}: ${String(err)}`);
    }
  }
}
