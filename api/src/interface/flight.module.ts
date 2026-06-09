import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { FlightController } from './http/flight.controller';
import { AdminFlightController } from './http/admin-flight.controller';
import { RefreshFlightPricesHandler } from '../application/flight/refresh-flight-prices.handler';
import { GetCheapestPerOriginHandler } from '../application/flight/get-cheapest-per-origin.handler';
import { GetQuotesForOriginHandler } from '../application/flight/get-quotes-for-origin.handler';
import { FlightPriceCron } from '../infrastructure/flight/flight-price.cron';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgFlightQuoteRepository } from '../infrastructure/flight/pg-flight-quote.repository';
import { createFlightPriceProvider } from '../infrastructure/flight/flight-provider.factory';
import { FLIGHT_QUOTE_REPOSITORY } from '../domain/flight/flight-quote.repository.port';
import { FLIGHT_PRICE_PROVIDER } from '../domain/flight/flight-price-provider.port';

@Module({
  imports: [CqrsModule, ScheduleModule.forRoot()],
  controllers: [FlightController, AdminFlightController],
  providers: [
    RefreshFlightPricesHandler,
    GetCheapestPerOriginHandler,
    GetQuotesForOriginHandler,
    FlightPriceCron,
    pgPoolProvider,
    { provide: FLIGHT_QUOTE_REPOSITORY, useClass: PgFlightQuoteRepository },
    { provide: FLIGHT_PRICE_PROVIDER, useFactory: createFlightPriceProvider },
  ],
})
export class FlightModule {}
