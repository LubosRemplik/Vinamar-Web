import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthController } from './http/admin-auth.controller';
import { AdminInquiryController } from './http/admin-inquiry.controller';
import { AdminBlockController } from './http/admin-block.controller';
import { AdminCalendarController } from './http/admin-calendar.controller';
import { AdminGuard } from './http/admin.guard';

// NOTE: Do NOT re-register the CQRS handlers or repositories here. They are
// already provided by InquiryModule and AvailabilityModule and are bound to the
// app-global CommandBus/QueryBus. Re-providing the same handler class in a second
// module makes @nestjs/cqrs throw on duplicate registration. AdminModule only owns
// its controllers, the JWT guard, and JwtModule for token verification.
@Module({
  imports: [CqrsModule, JwtModule.register({})],
  controllers: [
    AdminAuthController,
    AdminInquiryController,
    AdminBlockController,
    AdminCalendarController,
  ],
  providers: [AdminGuard],
})
export class AdminModule {}
