import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OptimizerController } from './http/optimizer.controller';
import { FindCheapestWindowsHandler } from '../application/optimizer/find-cheapest-windows.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgFlightQuoteRepository } from '../infrastructure/flight/pg-flight-quote.repository';
import { PgAvailabilityRepository } from '../infrastructure/persistence/pg-availability.repository';
import { AviasalesDeepLinkBuilder } from '../infrastructure/flight/aviasales-deep-link-builder';
import { SystemClock } from '../infrastructure/time/system-clock';
import { FLIGHT_QUOTE_REPOSITORY } from '../domain/flight/flight-quote.repository.port';
import { AVAILABILITY_REPOSITORY } from '../domain/availability/availability.repository.port';
import { FLIGHT_DEEP_LINK_BUILDER } from '../domain/flight/flight-deep-link-builder.port';
import { CLOCK } from '../domain/shared/clock.port';

@Module({
  imports: [CqrsModule],
  controllers: [OptimizerController],
  providers: [
    FindCheapestWindowsHandler,
    pgPoolProvider,
    { provide: FLIGHT_QUOTE_REPOSITORY, useClass: PgFlightQuoteRepository },
    { provide: AVAILABILITY_REPOSITORY, useClass: PgAvailabilityRepository },
    { provide: FLIGHT_DEEP_LINK_BUILDER, useClass: AviasalesDeepLinkBuilder },
    { provide: CLOCK, useClass: SystemClock },
  ],
})
export class OptimizerModule {}
