import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';
import { FlightQuote } from '../../src/domain/flight/flight-quote';
import { FlightPriceProvider } from '../../src/domain/flight/flight-price-provider.port';
import { FlightQuoteRepository } from '../../src/domain/flight/flight-quote.repository.port';
import { FlightSchedule } from '../../src/domain/flight/flight-schedule';
import { FlightScheduleRepository } from '../../src/domain/flight/flight-schedule.repository.port';

export function quote(origin: Origin, amount: number): FlightQuote {
  return new FlightQuote(
    origin,
    new Date('2026-05-01'),
    new Date('2026-05-08'),
    new Money(amount),
    'FR',
    'https://example/deep',
    new Date('2026-01-01'),
  );
}

export class StubProvider implements FlightPriceProvider {
  constructor(
    private readonly priceByCode: Record<string, number>,
    private readonly failCode?: string,
  ) {}
  async cheapestForOrigin(origin: Origin): Promise<FlightQuote[]> {
    if (origin.code === this.failCode) {
      throw new Error('provider failed');
    }
    return [quote(origin, this.priceByCode[origin.code] ?? 100)];
  }
}

export class InMemoryFlightQuotes implements FlightQuoteRepository {
  store = new Map<string, FlightQuote[]>();
  async replaceForOrigin(origin: Origin, quotes: FlightQuote[]): Promise<void> {
    this.store.set(origin.code, quotes);
  }
  async cheapestPerOrigin(): Promise<FlightQuote[]> {
    return [...this.store.values()]
      .map((qs) => qs.slice().sort((a, b) => a.price.amount - b.price.amount)[0])
      .filter(Boolean);
  }
  async listForOrigin(origin: Origin): Promise<FlightQuote[]> {
    return this.store.get(origin.code) ?? [];
  }
}

export class InMemoryFlightSchedules implements FlightScheduleRepository {
  store = new Map<string, FlightSchedule[]>();
  async replaceForOrigin(origin: Origin, schedules: FlightSchedule[]): Promise<void> {
    this.store.set(origin.code, schedules);
  }
  async listInRange(from: string, to: string): Promise<FlightSchedule[]> {
    return [...this.store.values()]
      .flat()
      .filter((s) => s.date >= from && s.date <= to);
  }
}
