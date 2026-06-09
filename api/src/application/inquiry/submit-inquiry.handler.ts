import { Inject } from '@nestjs/common';
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
import { CLOCK, Clock } from '../../domain/shared/clock.port';
import { DatesUnavailableError } from '../../domain/availability/dates-unavailable.error';

@CommandHandler(SubmitInquiryCommand)
export class SubmitInquiryHandler implements ICommandHandler<SubmitInquiryCommand> {
  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(OWNER_NOTIFIER) private readonly notifier: OwnerNotifier,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly idFactory: () => string = randomUUID,
  ) {}

  async execute(cmd: SubmitInquiryCommand): Promise<{ id: string }> {
    const range = new DateRange(new Date(cmd.arrival), new Date(cmd.departure));
    const inquiry = Inquiry.create({
      id: this.idFactory(),
      guestName: cmd.guestName,
      email: new EmailAddress(cmd.email),
      range,
      message: cmd.message,
      now: this.clock.now(),
    });
    if (await this.availability.findOverlapping(range)) {
      throw new DatesUnavailableError();
    }
    await this.inquiries.save(inquiry);
    await this.notifier.inquiryReceived(inquiry);
    return { id: inquiry.id };
  }
}
