import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelCalendarEntryCommand } from './cancel-calendar-entry.command';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';

@CommandHandler(CancelCalendarEntryCommand)
export class CancelCalendarEntryHandler implements ICommandHandler<CancelCalendarEntryCommand> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
  ) {}

  // Deleting the calendar entry frees the term. If it came from an inquiry,
  // mark that inquiry cancelled so it no longer reads as an active booking.
  // The two writes are sequential (no shared transaction), matching how
  // confirm-inquiry writes across both tables.
  async execute(cmd: CancelCalendarEntryCommand): Promise<void> {
    const { inquiryId } = await this.availability.delete(cmd.id);
    if (inquiryId) {
      await this.inquiries.updateStatus(inquiryId, 'cancelled');
    }
  }
}
