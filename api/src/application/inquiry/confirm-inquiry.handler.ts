import { Inject } from '@nestjs/common';
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

@CommandHandler(ConfirmInquiryCommand)
export class ConfirmInquiryHandler implements ICommandHandler<ConfirmInquiryCommand> {
  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
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
  }
}
