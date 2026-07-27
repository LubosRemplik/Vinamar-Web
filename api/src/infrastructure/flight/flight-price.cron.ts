import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import { RefreshFlightPricesCommand } from '../../application/flight/refresh-flight-prices.command';

@Injectable()
export class FlightPriceCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(FlightPriceCron.name);
  private readonly horizon = Number(process.env.FLIGHTS_HORIZON_MONTHS ?? 9);

  constructor(private readonly commandBus: CommandBus) {}

  onApplicationBootstrap(): void {
    this.logger.log('initial flight price refresh');
    // Fire-and-forget: awaiting here would keep app.listen() from running
    // until every external price request finishes (or hangs).
    void this.commandBus
      .execute(new RefreshFlightPricesCommand(this.horizon))
      .catch((err) => this.logger.warn(`initial refresh failed: ${String(err)}`));
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async daily(): Promise<void> {
    await this.commandBus.execute(new RefreshFlightPricesCommand(this.horizon));
  }
}
