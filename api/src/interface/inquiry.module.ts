import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { InquiryController } from './http/inquiry.controller';
import { SubmitInquiryHandler } from '../application/inquiry/submit-inquiry.handler';
import { ConfirmInquiryHandler } from '../application/inquiry/confirm-inquiry.handler';
import { DeclineInquiryHandler } from '../application/inquiry/decline-inquiry.handler';
import { ListInquiriesHandler } from '../application/inquiry/list-inquiries.handler';
import { ListCalendarHandler } from '../application/availability/list-calendar.handler';
import { CancelCalendarEntryHandler } from '../application/availability/cancel-calendar-entry.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgInquiryRepository } from '../infrastructure/persistence/pg-inquiry.repository';
import { PgAvailabilityRepository } from '../infrastructure/persistence/pg-availability.repository';
import { SmtpOwnerNotifier } from '../infrastructure/notify/smtp-owner-notifier';
import { SmtpGuestNotifier } from '../infrastructure/notify/smtp-guest-notifier';
import { ArrivalReminderCron } from '../infrastructure/notify/arrival-reminder.cron';
import { SystemClock } from '../infrastructure/time/system-clock';
import { SendArrivalRemindersHandler } from '../application/inquiry/send-arrival-reminders.handler';
import { INQUIRY_REPOSITORY } from '../domain/inquiry/inquiry.repository.port';
import { AVAILABILITY_REPOSITORY } from '../domain/availability/availability.repository.port';
import { OWNER_NOTIFIER } from '../domain/inquiry/owner-notifier.port';
import { GUEST_NOTIFIER } from '../domain/inquiry/guest-notifier.port';
import { CLOCK } from '../domain/shared/clock.port';

@Module({
  imports: [CqrsModule, JwtModule.register({})],
  controllers: [InquiryController],
  providers: [
    SubmitInquiryHandler,
    ConfirmInquiryHandler,
    DeclineInquiryHandler,
    ListInquiriesHandler,
    ListCalendarHandler,
    CancelCalendarEntryHandler,
    pgPoolProvider,
    { provide: INQUIRY_REPOSITORY, useClass: PgInquiryRepository },
    { provide: AVAILABILITY_REPOSITORY, useClass: PgAvailabilityRepository },
    { provide: OWNER_NOTIFIER, useClass: SmtpOwnerNotifier },
    { provide: GUEST_NOTIFIER, useClass: SmtpGuestNotifier },
    SendArrivalRemindersHandler,
    ArrivalReminderCron,
    { provide: CLOCK, useClass: SystemClock },
  ],
})
export class InquiryModule {}
