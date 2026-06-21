import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmInquiryCommand } from './confirm-inquiry.command';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';
import { DatesUnavailableError } from '../../domain/availability/dates-unavailable.error';
import { GUEST_NOTIFIER, GuestNotifier } from '../../domain/inquiry/guest-notifier.port';

@CommandHandler(ConfirmInquiryCommand)
export class ConfirmInquiryHandler implements ICommandHandler<ConfirmInquiryCommand> {
  private readonly logger = new Logger(ConfirmInquiryHandler.name);

  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(GUEST_NOTIFIER) private readonly guest: GuestNotifier,
  ) {}

  async execute(cmd: ConfirmInquiryCommand): Promise<void> {
    const inquiry = await this.inquiries.get(cmd.id);
    if (!inquiry) {
      throw new Error('inquiry not found');
    }
    if (await this.availability.findOverlapping(inquiry.range)) {
      throw new DatesUnavailableError();
    }
    await this.inquiries.updateStatus(cmd.id, 'confirmed');
    await this.availability.save(inquiry.range, 'booked', { inquiryId: inquiry.id });
    await this.safeGuest(() => this.guest.bookingConfirmed(inquiry), inquiry.id);

    // The term is now booked, so every other still-pending inquiry whose dates
    // overlap it can no longer be honoured — decline them automatically.
    const others = await this.inquiries.list();
    for (const other of others) {
      if (
        other.id !== inquiry.id &&
        other.status === 'pending' &&
        other.range.overlaps(inquiry.range)
      ) {
        await this.inquiries.updateStatus(other.id, 'declined');
        await this.safeGuest(() => this.guest.inquiryDeclined(other), other.id);
      }
    }
  }

  private async safeGuest(fn: () => Promise<void>, id: string): Promise<void> {
    try { await fn(); } catch (err) { this.logger.warn(`guest notification failed for inquiry ${id}: ${String(err)}`); }
  }
}
