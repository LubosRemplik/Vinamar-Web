import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCheapestPerOriginQuery } from './get-cheapest-per-origin.query';
import {
  FLIGHT_QUOTE_REPOSITORY,
  FlightQuoteRepository,
} from '../../domain/flight/flight-quote.repository.port';

@QueryHandler(GetCheapestPerOriginQuery)
export class GetCheapestPerOriginHandler implements IQueryHandler<GetCheapestPerOriginQuery> {
  constructor(@Inject(FLIGHT_QUOTE_REPOSITORY) private readonly repo: FlightQuoteRepository) {}

  async execute() {
    const quotes = await this.repo.cheapestPerOrigin();
    return quotes.map((q) => ({
      origin: q.origin.code,
      originName: q.origin.name,
      price: q.price.amount,
      currency: q.price.currency,
      departureDate: q.departureDate.toISOString().slice(0, 10),
      returnDate: q.returnDate.toISOString().slice(0, 10),
      airline: q.airline,
      deepLink: q.deepLink,
    }));
  }
}
