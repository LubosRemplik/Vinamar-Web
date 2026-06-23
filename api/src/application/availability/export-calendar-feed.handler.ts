import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ExportCalendarFeedQuery } from './export-calendar-feed.query';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';
import { CLOCK, Clock } from '../../domain/shared/clock.port';
import { buildIcalendar } from '../../domain/calendar/ical';
import { toReservationEvent } from './reservation-ical-event';

const PROD_ID = '-//Vinamar//Rezervace//CS';

// Builds a single iCalendar feed of ALL current reservations, so the owner can
// subscribe once and keep an up-to-date overview. listEntries() only returns
// active bookings (cancelling deletes the entry), so the feed self-prunes.
@QueryHandler(ExportCalendarFeedQuery)
export class ExportCalendarFeedHandler implements IQueryHandler<ExportCalendarFeedQuery> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(_query: ExportCalendarFeedQuery): Promise<string> {
    const entries = await this.availability.listEntries();
    return buildIcalendar(entries.map(toReservationEvent), {
      prodId: PROD_ID,
      dtstamp: this.clock.now(),
      calName: 'Vinamar — rezervace',
    });
  }
}
