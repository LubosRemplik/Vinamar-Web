import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetCheapestPerOriginQuery } from '../../application/flight/get-cheapest-per-origin.query';
import { GetQuotesForOriginQuery } from '../../application/flight/get-quotes-for-origin.query';
import { FindSchedulesQuery } from '../../application/flight/find-schedules.query';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

@Controller('flights')
export class FlightController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('cheapest')
  cheapest() {
    return this.queryBus.execute(new GetCheapestPerOriginQuery());
  }

  @Get('schedules')
  schedules(@Query('from') from?: string, @Query('to') to?: string) {
    const today = new Date();
    const defaultTo = new Date(today);
    defaultTo.setDate(defaultTo.getDate() + 30);
    return this.queryBus.execute(
      new FindSchedulesQuery(from ?? iso(today), to ?? iso(defaultTo)),
    );
  }

  @Get()
  forOrigin(@Query('origin') origin: string) {
    return this.queryBus.execute(new GetQuotesForOriginQuery(origin));
  }
}
