import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { FlightController } from './http/flight.controller';
import { AdminFlightController } from './http/admin-flight.controller';
import { RefreshFlightPricesHandler } from '../application/flight/refresh-flight-prices.handler';
import { GetCheapestPerOriginHandler } from '../application/flight/get-cheapest-per-origin.handler';
import { GetQuotesForOriginHandler } from '../application/flight/get-quotes-for-origin.handler';
import { RefreshFlightSchedulesHandler } from '../application/flight/refresh-flight-schedules.handler';
import { FindSchedulesHandler } from '../application/flight/find-schedules.handler';
import { FlightPriceCron } from '../infrastructure/flight/flight-price.cron';
import { FlightScheduleCron } from '../infrastructure/flight/flight-schedule.cron';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgFlightQuoteRepository } from '../infrastructure/flight/pg-flight-quote.repository';
import { PgFlightScheduleRepository } from '../infrastructure/flight/pg-flight-schedule.repository';
import { RyanairScheduleProvider } from '../infrastructure/flight/ryanair-schedule-provider';
import { createFlightPriceProvider } from '../infrastructure/flight/flight-provider.factory';
import { FLIGHT_QUOTE_REPOSITORY } from '../domain/flight/flight-quote.repository.port';
import { FLIGHT_PRICE_PROVIDER } from '../domain/flight/flight-price-provider.port';
import { FLIGHT_SCHEDULE_REPOSITORY } from '../domain/flight/flight-schedule.repository.port';
import { FLIGHT_SCHEDULE_PROVIDER } from '../domain/flight/flight-schedule-provider.port';

@Module({
  imports: [CqrsModule, ScheduleModule.forRoot()],
  controllers: [FlightController, AdminFlightController],
  providers: [
    RefreshFlightPricesHandler,
    GetCheapestPerOriginHandler,
    GetQuotesForOriginHandler,
    RefreshFlightSchedulesHandler,
    FindSchedulesHandler,
    FlightPriceCron,
    FlightScheduleCron,
    pgPoolProvider,
    { provide: FLIGHT_QUOTE_REPOSITORY, useClass: PgFlightQuoteRepository },
    { provide: FLIGHT_PRICE_PROVIDER, useFactory: createFlightPriceProvider },
    { provide: FLIGHT_SCHEDULE_REPOSITORY, useClass: PgFlightScheduleRepository },
    { provide: FLIGHT_SCHEDULE_PROVIDER, useFactory: () => new RyanairScheduleProvider() },
  ],
})
export class FlightModule {}
