import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { InquiryController } from './http/inquiry.controller';
import { SubmitInquiryHandler } from '../application/inquiry/submit-inquiry.handler';
import { ConfirmInquiryHandler } from '../application/inquiry/confirm-inquiry.handler';
import { DeclineInquiryHandler } from '../application/inquiry/decline-inquiry.handler';
import { ListInquiriesHandler } from '../application/inquiry/list-inquiries.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgInquiryRepository } from '../infrastructure/persistence/pg-inquiry.repository';
import { PgAvailabilityRepository } from '../infrastructure/persistence/pg-availability.repository';
import { SmtpOwnerNotifier } from '../infrastructure/notify/smtp-owner-notifier';
import { SystemClock } from '../infrastructure/time/system-clock';
import { INQUIRY_REPOSITORY } from '../domain/inquiry/inquiry.repository.port';
import { AVAILABILITY_REPOSITORY } from '../domain/availability/availability.repository.port';
import { OWNER_NOTIFIER } from '../domain/inquiry/owner-notifier.port';
import { CLOCK } from '../domain/shared/clock.port';

@Module({
  imports: [CqrsModule],
  controllers: [InquiryController],
  providers: [
    SubmitInquiryHandler,
    ConfirmInquiryHandler,
    DeclineInquiryHandler,
    ListInquiriesHandler,
    pgPoolProvider,
    { provide: INQUIRY_REPOSITORY, useClass: PgInquiryRepository },
    { provide: AVAILABILITY_REPOSITORY, useClass: PgAvailabilityRepository },
    { provide: OWNER_NOTIFIER, useClass: SmtpOwnerNotifier },
    { provide: CLOCK, useClass: SystemClock },
  ],
})
export class InquiryModule {}
