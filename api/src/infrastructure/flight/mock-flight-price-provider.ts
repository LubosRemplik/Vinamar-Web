import { Injectable } from '@nestjs/common';
import { Origin } from '../../domain/flight/origin';
import { Money } from '../../domain/flight/money';
import { FlightQuote } from '../../domain/flight/flight-quote';
import { FlightPriceProvider } from '../../domain/flight/flight-price-provider.port';

@Injectable()
export class MockFlightPriceProvider implements FlightPriceProvider {
  async cheapestForOrigin(origin: Origin, horizonMonths: number): Promise<FlightQuote[]> {
    const base = ({ PED: 95, WRO: 58, PRG: 75 } as Partial<Record<string, number>>)[origin.code] ?? 80;
    const quotes: FlightQuote[] = [];
    const start = new Date('2026-07-01');
    const weeks = horizonMonths * 4;
    for (let w = 0; w < weeks; w++) {
      const departure = new Date(start);
      departure.setDate(start.getDate() + w * 7);
      const ret = new Date(departure);
      ret.setDate(departure.getDate() + 7);
      const price = base + ((w * 7) % 40);
      quotes.push(
        new FlightQuote(
          origin,
          departure,
          ret,
          new Money(price),
          'FR',
          `https://www.aviasales.com/search/${origin.code}ALC?marker=mock`,
          new Date(),
        ),
      );
    }
    return quotes;
  }
}
