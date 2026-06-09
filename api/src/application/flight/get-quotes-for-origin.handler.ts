import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetQuotesForOriginQuery } from './get-quotes-for-origin.query';
import { Origin } from '../../domain/flight/origin';
import {
  FLIGHT_QUOTE_REPOSITORY,
  FlightQuoteRepository,
} from '../../domain/flight/flight-quote.repository.port';

@QueryHandler(GetQuotesForOriginQuery)
export class GetQuotesForOriginHandler implements IQueryHandler<GetQuotesForOriginQuery> {
  constructor(@Inject(FLIGHT_QUOTE_REPOSITORY) private readonly repo: FlightQuoteRepository) {}

  async execute(q: GetQuotesForOriginQuery) {
    const quotes = await this.repo.listForOrigin(Origin.fromCode(q.origin));
    return quotes.map((quote) => ({
      origin: quote.origin.code,
      price: quote.price.amount,
      currency: quote.price.currency,
      departureDate: quote.departureDate.toISOString().slice(0, 10),
      returnDate: quote.returnDate.toISOString().slice(0, 10),
      airline: quote.airline,
      deepLink: quote.deepLink,
    }));
  }
}
