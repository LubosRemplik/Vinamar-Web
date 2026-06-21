import { Inject, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { SubmitInquiryCommand } from './submit-inquiry.command';
import { Inquiry } from '../../domain/inquiry/inquiry';
import { EmailAddress } from '../../domain/shared/email-address';
import { DateRange } from '../../domain/shared/date-range';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';
import {
  OWNER_NOTIFIER,
  OwnerNotifier,
} from '../../domain/inquiry/owner-notifier.port';
import { GUEST_NOTIFIER, GuestNotifier } from '../../domain/inquiry/guest-notifier.port';
import { CLOCK, Clock } from '../../domain/shared/clock.port';
import { DatesUnavailableError } from '../../domain/availability/dates-unavailable.error';
import { OrphanGapError } from '../../domain/availability/orphan-gap.error';
import { BookingGapPolicy } from '../../domain/availability/booking-gap-policy';
import { MINIMUM_NIGHTS } from '../../domain/inquiry/inquiry';

@CommandHandler(SubmitInquiryCommand)
export class SubmitInquiryHandler implements ICommandHandler<SubmitInquiryCommand> {
  private readonly logger = new Logger(SubmitInquiryHandler.name);
  private readonly gapPolicy = new BookingGapPolicy();

  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(OWNER_NOTIFIER) private readonly notifier: OwnerNotifier,
    @Inject(GUEST_NOTIFIER) private readonly guest: GuestNotifier,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() private readonly idFactory: () => string = randomUUID,
  ) {}

  async execute(cmd: SubmitInquiryCommand): Promise<{ id: string }> {
    const range = new DateRange(new Date(cmd.arrival), new Date(cmd.departure));
    const params = {
      id: this.idFactory(),
      guestName: cmd.guestName,
      email: new EmailAddress(cmd.email),
      phone: cmd.phone,
      range,
      message: cmd.message,
      now: this.clock.now(),
    };
    // Admin books on behalf of a guest: stay rules (min nights, arrival-in-past,
    // orphan gap) do not apply — only availability is enforced.
    const inquiry = cmd.isAdmin ? Inquiry.createByAdmin(params) : Inquiry.create(params);

    if (await this.availability.findOverlapping(range)) {
      throw new DatesUnavailableError();
    }

    if (!cmd.isAdmin) {
      const windowStart = new Date(range.arrival);
      windowStart.setDate(windowStart.getDate() - MINIMUM_NIGHTS);
      const windowEnd = new Date(range.departure);
      windowEnd.setDate(windowEnd.getDate() + MINIMUM_NIGHTS);
      const neighbours = await this.availability.listBetween(windowStart, windowEnd);
      if (this.gapPolicy.wouldCreateOrphanGap(range, neighbours, MINIMUM_NIGHTS)) {
        throw new OrphanGapError();
      }
    }

    await this.inquiries.save(inquiry);

    // Admin bookings are firm reservations: confirm them straight away by
    // occupying the term, and skip the owner notification (the owner is acting).
    if (cmd.isAdmin) {
      await this.availability.save(range, 'booked', { inquiryId: inquiry.id });
      await this.safeGuest(() => this.guest.bookingConfirmed(inquiry), inquiry.id);
      return { id: inquiry.id };
    }

    // Email is best-effort: a notifier failure must not fail the guest's
    // inquiry (it is persisted and visible in the admin dashboard regardless).
    try {
      await this.notifier.inquiryReceived(inquiry);
    } catch (err) {
      this.logger.warn(`owner notification failed for inquiry ${inquiry.id}: ${String(err)}`);
    }
    await this.safeGuest(() => this.guest.inquiryReceived(inquiry), inquiry.id);
    return { id: inquiry.id };
  }

  private async safeGuest(fn: () => Promise<void>, id: string): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(`guest notification failed for inquiry ${id}: ${String(err)}`);
    }
  }
}
