import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FindAvailabilityCalendarQuery } from '../../application/calendar/find-availability-calendar.query';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  find(
    @Query('origin') origin: string,
    @Query('nights') nights?: string,
    @Query('months') months?: string,
  ) {
    return this.queryBus.execute(
      new FindAvailabilityCalendarQuery(origin, Number(nights ?? 7), Number(months ?? 12)),
    );
  }
}
