import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshFlightSchedulesCommand } from './refresh-flight-schedules.command';
import { Origin } from '../../domain/flight/origin';
import {
  FLIGHT_SCHEDULE_PROVIDER,
  FlightScheduleProvider,
} from '../../domain/flight/flight-schedule-provider.port';
import {
  FLIGHT_SCHEDULE_REPOSITORY,
  FlightScheduleRepository,
} from '../../domain/flight/flight-schedule.repository.port';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

@CommandHandler(RefreshFlightSchedulesCommand)
export class RefreshFlightSchedulesHandler
  implements ICommandHandler<RefreshFlightSchedulesCommand>
{
  private readonly logger = new Logger(RefreshFlightSchedulesHandler.name);

  constructor(
    @Inject(FLIGHT_SCHEDULE_PROVIDER) private readonly provider: FlightScheduleProvider,
    @Inject(FLIGHT_SCHEDULE_REPOSITORY) private readonly repo: FlightScheduleRepository,
  ) {}

  async execute(cmd: RefreshFlightSchedulesCommand): Promise<void> {
    const now = new Date();
    const from = iso(now);
    const horizonEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + cmd.horizonMonths + 1, 0));
    const to = iso(horizonEnd);

    for (const origin of Origin.allByPreference()) {
      try {
        const schedules = await this.provider.schedulesForOrigin(origin, from, to);
        await this.repo.replaceForOrigin(origin, schedules);
        this.logger.log(`refreshed ${origin.code}: ${schedules.length} flights`);
      } catch (err) {
        this.logger.warn(`schedule refresh failed for ${origin.code}: ${String(err)}`);
      }
    }
  }
}
