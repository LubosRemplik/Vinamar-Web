import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindCheapestWindowsQuery } from './find-cheapest-windows.query';
import { CheapestWindowFinder } from '../../domain/optimizer/cheapest-window-finder';
import { WindowSuggestion } from '../../domain/optimizer/window-suggestion';
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

export interface WindowSuggestionDto {
  origin: string;
  arrival: string;
  departure: string;
  nights: number;
  indicativePrice: number;
  currency: string;
  flightDeepLink: string;
  hasOrphanGap: boolean;
}

@QueryHandler(FindCheapestWindowsQuery)
export class FindCheapestWindowsHandler
  implements IQueryHandler<FindCheapestWindowsQuery, WindowSuggestionDto[]>
{
  private readonly finder = new CheapestWindowFinder();

  constructor(
    @Inject(FLIGHT_QUOTE_REPOSITORY) private readonly quotes: FlightQuoteRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(FLIGHT_DEEP_LINK_BUILDER) private readonly deepLink: FlightDeepLinkBuilder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(q: FindCheapestWindowsQuery): Promise<WindowSuggestionDto[]> {
    const origin = Origin.fromCode(q.origin);
    const now = this.clock.now();
    const horizonEnd = new Date(now);
    horizonEnd.setMonth(horizonEnd.getMonth() + 12);

    const quotes = await this.quotes.listForOrigin(origin);
    const blocks = await this.availability.listBetween(now, horizonEnd);

    return this.finder
      .find(quotes, blocks, q.nights, now)
      .slice(0, q.limit)
      .map((s: WindowSuggestion) => ({
        origin: s.origin.code,
        arrival: iso(s.range.arrival),
        departure: iso(s.range.departure),
        nights: q.nights,
        indicativePrice: s.indicativePrice.amount,
        currency: s.indicativePrice.currency,
        flightDeepLink: this.deepLink.forDates(s.origin, s.range.arrival, s.range.departure),
        hasOrphanGap: s.orphanPenalty > 0,
      }));
  }
}
