import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeclineInquiryCommand } from './decline-inquiry.command';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';

@CommandHandler(DeclineInquiryCommand)
export class DeclineInquiryHandler implements ICommandHandler<DeclineInquiryCommand> {
  constructor(@Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository) {}
  async execute(cmd: DeclineInquiryCommand): Promise<void> {
    await this.inquiries.updateStatus(cmd.id, 'declined');
  }
}
