import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AvailabilityController } from './http/availability.controller';
import { GetAvailabilityHandler } from '../application/availability/get-availability.handler';
import { BlockDatesHandler } from '../application/availability/block-dates.handler';
import { UnblockDatesHandler } from '../application/availability/unblock-dates.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgAvailabilityRepository } from '../infrastructure/persistence/pg-availability.repository';
import { AVAILABILITY_REPOSITORY } from '../domain/availability/availability.repository.port';

const availabilityRepo = { provide: AVAILABILITY_REPOSITORY, useClass: PgAvailabilityRepository };

@Module({
  imports: [CqrsModule],
  controllers: [AvailabilityController],
  providers: [GetAvailabilityHandler, BlockDatesHandler, UnblockDatesHandler, pgPoolProvider, availabilityRepo],
  exports: [availabilityRepo, pgPoolProvider],
})
export class AvailabilityModule {}
