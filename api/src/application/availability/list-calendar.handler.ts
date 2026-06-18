import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListCalendarQuery } from './list-calendar.query';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
  CalendarEntryView,
} from '../../domain/availability/availability.repository.port';

@QueryHandler(ListCalendarQuery)
export class ListCalendarHandler implements IQueryHandler<ListCalendarQuery> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
  ) {}

  execute(): Promise<CalendarEntryView[]> {
    return this.availability.listEntries();
  }
}
