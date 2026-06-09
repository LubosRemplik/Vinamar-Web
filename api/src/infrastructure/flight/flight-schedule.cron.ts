import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import { RefreshFlightSchedulesCommand } from '../../application/flight/refresh-flight-schedules.command';

@Injectable()
export class FlightScheduleCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(FlightScheduleCron.name);
  private readonly horizon = Number(process.env.FLIGHTS_HORIZON_MONTHS ?? 9);

  constructor(private readonly commandBus: CommandBus) {}

  async onApplicationBootstrap(): Promise<void> {
    // Skip the network-heavy refresh when running the test suite.
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.logger.log('initial flight schedule refresh');
    await this.commandBus.execute(new RefreshFlightSchedulesCommand(this.horizon));
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async daily(): Promise<void> {
    await this.commandBus.execute(new RefreshFlightSchedulesCommand(this.horizon));
  }
}
