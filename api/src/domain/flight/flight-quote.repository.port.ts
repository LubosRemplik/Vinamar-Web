import { Origin } from './origin';
import { FlightQuote } from './flight-quote';

export const FLIGHT_QUOTE_REPOSITORY = Symbol('FlightQuoteRepository');

export interface FlightQuoteRepository {
  replaceForOrigin(origin: Origin, quotes: FlightQuote[]): Promise<void>;
  cheapestPerOrigin(): Promise<FlightQuote[]>;
  listForOrigin(origin: Origin): Promise<FlightQuote[]>;
}
