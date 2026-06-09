import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAvailabilityQuery } from '../../application/availability/get-availability.query';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async availability(@Query('from') from: string, @Query('to') to: string) {
    const blocks = await this.queryBus.execute(new GetAvailabilityQuery(from, to));
    return { blocks };
  }
}
