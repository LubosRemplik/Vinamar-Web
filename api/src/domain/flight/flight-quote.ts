import { Origin } from './origin';
import { Money } from './money';

export class FlightQuote {
  constructor(
    public readonly origin: Origin,
    public readonly departureDate: Date,
    public readonly returnDate: Date,
    public readonly price: Money,
    public readonly airline: string,
    public readonly deepLink: string,
    public readonly fetchedAt: Date,
  ) {}
}
