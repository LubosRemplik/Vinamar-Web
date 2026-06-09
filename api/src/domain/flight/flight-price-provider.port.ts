import { Origin } from './origin';
import { FlightQuote } from './flight-quote';

export const FLIGHT_PRICE_PROVIDER = Symbol('FlightPriceProvider');

export interface FlightPriceProvider {
  cheapestForOrigin(origin: Origin, horizonMonths: number): Promise<FlightQuote[]>;
}
