import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RefreshFlightPricesCommand } from '../../application/flight/refresh-flight-prices.command';

@Controller('admin/flights')
export class AdminFlightController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('refresh')
  async refresh(@Headers('x-refresh-token') token?: string) {
    const expected = process.env.FLIGHTS_REFRESH_TOKEN ?? '';
    if (!expected || token !== expected) {
      throw new ForbiddenException();
    }
    await this.commandBus.execute(
      new RefreshFlightPricesCommand(Number(process.env.FLIGHTS_HORIZON_MONTHS ?? 9)),
    );
    return { refreshed: true };
  }
}
