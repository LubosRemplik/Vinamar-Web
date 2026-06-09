import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './interface/health.module';
import { AvailabilityModule } from './interface/availability.module';
import { InquiryModule } from './interface/inquiry.module';
import { AdminModule } from './interface/admin.module';
import { FlightModule } from './interface/flight.module';
import { OptimizerModule } from './interface/optimizer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AvailabilityModule,
    InquiryModule,
    AdminModule,
    FlightModule,
    OptimizerModule,
  ],
})
export class AppModule {}
