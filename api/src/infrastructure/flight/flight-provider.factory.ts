import { FlightPriceProvider } from '../../domain/flight/flight-price-provider.port';
import { MockFlightPriceProvider } from './mock-flight-price-provider';
import { TravelpayoutsFlightPriceProvider } from './travelpayouts-flight-price-provider';

export function createFlightPriceProvider(): FlightPriceProvider {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  const marker = process.env.TRAVELPAYOUTS_MARKER ?? '';
  if (token) {
    return new TravelpayoutsFlightPriceProvider(token, marker);
  }
  return new MockFlightPriceProvider();
}
