import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshFlightPricesCommand } from './refresh-flight-prices.command';
import { Origin } from '../../domain/flight/origin';
import {
  FLIGHT_PRICE_PROVIDER,
  FlightPriceProvider,
} from '../../domain/flight/flight-price-provider.port';
import {
  FLIGHT_QUOTE_REPOSITORY,
  FlightQuoteRepository,
} from '../../domain/flight/flight-quote.repository.port';

@CommandHandler(RefreshFlightPricesCommand)
export class RefreshFlightPricesHandler implements ICommandHandler<RefreshFlightPricesCommand> {
  private readonly logger = new Logger(RefreshFlightPricesHandler.name);

  constructor(
    @Inject(FLIGHT_PRICE_PROVIDER) private readonly provider: FlightPriceProvider,
    @Inject(FLIGHT_QUOTE_REPOSITORY) private readonly repo: FlightQuoteRepository,
  ) {}

  async execute(cmd: RefreshFlightPricesCommand): Promise<void> {
    for (const origin of Origin.all()) {
      try {
        const quotes = await this.provider.cheapestForOrigin(origin, cmd.horizonMonths);
        await this.repo.replaceForOrigin(origin, quotes);
        this.logger.log(`refreshed ${origin.code}: ${quotes.length} quotes`);
      } catch (err) {
        this.logger.warn(`refresh failed for ${origin.code}: ${String(err)}`);
      }
    }
  }
}
