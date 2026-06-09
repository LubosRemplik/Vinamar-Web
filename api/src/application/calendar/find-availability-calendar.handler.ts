import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindAvailabilityCalendarQuery } from './find-availability-calendar.query';
import { CheapestWindowFinder } from '../../domain/optimizer/cheapest-window-finder';
import { AvailabilityCalendarBuilder } from '../../domain/calendar/availability-calendar-builder';
import { Origin } from '../../domain/flight/origin';
import {
  FLIGHT_QUOTE_REPOSITORY,
  FlightQuoteRepository,
} from '../../domain/flight/flight-quote.repository.port';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';
import {
  FLIGHT_DEEP_LINK_BUILDER,
  FlightDeepLinkBuilder,
} from '../../domain/flight/flight-deep-link-builder.port';
import { CLOCK, Clock } from '../../domain/shared/clock.port';

const iso = (d: Date): string => d.toISOString().slice(0, 10);

export interface MonthDto {
  year: number;
  month: number;
  freeRanges: { start: string; end: string }[];
  cheapest: {
    arrival: string;
    departure: string;
    nights: number;
    indicativePrice: number;
    currency: string;
    flightDeepLink: string;
    hasOrphanGap: boolean;
  } | null;
}

export interface AvailabilityCalendarDto {
  origin: string;
  nights: number;
  months: MonthDto[];
}

@QueryHandler(FindAvailabilityCalendarQuery)
export class FindAvailabilityCalendarHandler
  implements IQueryHandler<FindAvailabilityCalendarQuery, AvailabilityCalendarDto>
{
  private readonly finder = new CheapestWindowFinder();
  private readonly builder = new AvailabilityCalendarBuilder();

  constructor(
    @Inject(FLIGHT_QUOTE_REPOSITORY) private readonly quotes: FlightQuoteRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(FLIGHT_DEEP_LINK_BUILDER) private readonly deepLink: FlightDeepLinkBuilder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(q: FindAvailabilityCalendarQuery): Promise<AvailabilityCalendarDto> {
    const origin = Origin.fromCode(q.origin);
    const now = this.clock.now();
    const horizonEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + q.months, 1));

    const quotes = await this.quotes.listForOrigin(origin);
    const blocks = await this.availability.listBetween(now, horizonEnd);
    const windows = this.finder.find(quotes, blocks, q.nights, now);
    const calendar = this.builder.build(blocks, windows, now, horizonEnd);

    return {
      origin: origin.code,
      nights: q.nights,
      months: calendar.months.map((m) => ({
        year: m.year,
        month: m.month,
        freeRanges: m.freeRanges.map((r) => ({ start: iso(r.arrival), end: iso(r.departure) })),
        cheapest: m.cheapestWindow
          ? {
              arrival: iso(m.cheapestWindow.range.arrival),
              departure: iso(m.cheapestWindow.range.departure),
              nights: m.cheapestWindow.range.nights(),
              indicativePrice: m.cheapestWindow.indicativePrice.amount,
              currency: m.cheapestWindow.indicativePrice.currency,
              flightDeepLink: this.deepLink.forDates(
                m.cheapestWindow.origin,
                m.cheapestWindow.range.arrival,
                m.cheapestWindow.range.departure,
              ),
              hasOrphanGap: m.cheapestWindow.orphanPenalty > 0,
            }
          : null,
      })),
    };
  }
}
