import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeclineInquiryCommand } from './decline-inquiry.command';
import { INQUIRY_REPOSITORY, InquiryRepository } from '../../domain/inquiry/inquiry.repository.port';
import { GUEST_NOTIFIER, GuestNotifier } from '../../domain/inquiry/guest-notifier.port';

@CommandHandler(DeclineInquiryCommand)
export class DeclineInquiryHandler implements ICommandHandler<DeclineInquiryCommand> {
  private readonly logger = new Logger(DeclineInquiryHandler.name);
  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(GUEST_NOTIFIER) private readonly guest: GuestNotifier,
  ) {}

  async execute(cmd: DeclineInquiryCommand): Promise<void> {
    const inquiry = await this.inquiries.get(cmd.id);
    await this.inquiries.updateStatus(cmd.id, 'declined');
    if (inquiry) {
      try {
        await this.guest.inquiryDeclined(inquiry);
      } catch (err) {
        this.logger.warn(`guest notification failed for inquiry ${cmd.id}: ${String(err)}`);
      }
    }
  }
}
