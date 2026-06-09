import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetCheapestPerOriginQuery } from '../../application/flight/get-cheapest-per-origin.query';
import { GetQuotesForOriginQuery } from '../../application/flight/get-quotes-for-origin.query';

@Controller('flights')
export class FlightController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('cheapest')
  cheapest() {
    return this.queryBus.execute(new GetCheapestPerOriginQuery());
  }

  @Get()
  forOrigin(@Query('origin') origin: string) {
    return this.queryBus.execute(new GetQuotesForOriginQuery(origin));
  }
}
