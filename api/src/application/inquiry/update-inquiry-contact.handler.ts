import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateInquiryContactCommand } from './update-inquiry-contact.command';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';

@CommandHandler(UpdateInquiryContactCommand)
export class UpdateInquiryContactHandler implements ICommandHandler<UpdateInquiryContactCommand> {
  constructor(@Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository) {}

  async execute(cmd: UpdateInquiryContactCommand): Promise<void> {
    const inquiry = await this.inquiries.get(cmd.id);
    if (!inquiry) {
      throw new Error('inquiry not found');
    }
    await this.inquiries.updateContact(cmd.id, cmd.guestName, cmd.email, cmd.phone);
  }
}
