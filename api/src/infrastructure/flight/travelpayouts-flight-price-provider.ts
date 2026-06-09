import { Injectable } from '@nestjs/common';
import { Origin, DESTINATION } from '../../domain/flight/origin';
import { Money } from '../../domain/flight/money';
import { FlightQuote } from '../../domain/flight/flight-quote';
import { FlightPriceProvider } from '../../domain/flight/flight-price-provider.port';
import { buildDeepLink } from './aviasales-deep-link';

interface TravelpayoutsRow {
  price: number;
  airline?: string;
  departure_at: string;
  return_at?: string;
  link?: string;
}

interface TravelpayoutsResponse {
  data?: TravelpayoutsRow[];
}

type FetchLike = (url: string) => Promise<{
  ok: boolean;
  json: () => Promise<TravelpayoutsResponse>;
}>;

@Injectable()
export class TravelpayoutsFlightPriceProvider implements FlightPriceProvider {
  constructor(
    private readonly token: string,
    private readonly marker: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async cheapestForOrigin(origin: Origin, horizonMonths: number): Promise<FlightQuote[]> {
    const months = this.horizonMonths(horizonMonths);
    const byDate = new Map<string, FlightQuote>();
    for (const month of months) {
      const url =
        `https://api.travelpayouts.com/aviasales/v3/prices_for_dates` +
        `?origin=${origin.code}&destination=${DESTINATION}` +
        `&departure_at=${month}&currency=eur&sorting=price&direct=false` +
        `&limit=100&token=${this.token}`;
      const res = await this.fetchImpl(url);
      if (!res.ok) {
        continue;
      }
      const payload = await res.json();
      for (const row of payload.data ?? []) {
        const departure = new Date(row.departure_at);
        const key = departure.toISOString().slice(0, 10);
        const ret = row.return_at ? new Date(row.return_at) : this.plusNights(departure, 7);
        const quote = new FlightQuote(
          origin,
          departure,
          ret,
          new Money(Number(row.price)),
          row.airline ?? '',
          buildDeepLink(row.link ?? `/search/${origin.code}${DESTINATION}`, this.marker),
          new Date(),
        );
        const existing = byDate.get(key);
        if (!existing || quote.price.amount < existing.price.amount) {
          byDate.set(key, quote);
        }
      }
    }
    return [...byDate.values()].sort(
      (a, b) => a.departureDate.getTime() - b.departureDate.getTime(),
    );
  }

  private plusNights(date: Date, nights: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + nights);
    return d;
  }

  private horizonMonths(count: number): string[] {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }
}
