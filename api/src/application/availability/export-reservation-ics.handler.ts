import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ExportReservationIcsQuery } from './export-reservation-ics.query';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
  CalendarEntryView,
} from '../../domain/availability/availability.repository.port';
import { CLOCK, Clock } from '../../domain/shared/clock.port';
import { buildIcalendar, IcalEvent } from '../../domain/calendar/ical';

const PROD_ID = '-//Vinamar//Rezervace//CS';

@QueryHandler(ExportReservationIcsQuery)
export class ExportReservationIcsHandler implements IQueryHandler<ExportReservationIcsQuery> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // A single apartment has a small calendar, so filtering listEntries() in memory
  // is fine and avoids a new repository method / SQL just for one lookup.
  async execute(query: ExportReservationIcsQuery): Promise<string> {
    const entries = await this.availability.listEntries();
    const entry = entries.find((e) => e.id === query.id);
    if (!entry) {
      throw new NotFoundException(`Reservation ${query.id} not found`);
    }
    return buildIcalendar([this.toEvent(entry)], {
      prodId: PROD_ID,
      dtstamp: this.clock.now(),
      calName: 'Vinamar — rezervace',
    });
  }

  private toEvent(entry: CalendarEntryView): IcalEvent {
    const guest = entry.guestName?.trim() || 'Rezervace';
    const detail = [
      entry.guestName && `Host: ${entry.guestName}`,
      entry.phone && `Telefon: ${entry.phone}`,
      entry.email && `E-mail: ${entry.email}`,
      entry.message && `Poznámka: ${entry.message}`,
    ].filter(Boolean) as string[];

    return {
      uid: `${entry.id}@vinamar`,
      start: entry.start,
      end: entry.end,
      summary: `Vinamar — ${guest}`,
      description: detail.length ? detail.join('\n') : null,
    };
  }
}
