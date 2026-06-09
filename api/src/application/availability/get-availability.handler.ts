import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAvailabilityQuery } from './get-availability.query';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler implements IQueryHandler<GetAvailabilityQuery> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
  ) {}
  async execute(q: GetAvailabilityQuery) {
    const blocks = await this.availability.listBetween(new Date(q.from), new Date(q.to));
    return blocks.map((b) => ({
      start: b.range.arrival.toISOString().slice(0, 10),
      end: b.range.departure.toISOString().slice(0, 10),
    }));
  }
}
