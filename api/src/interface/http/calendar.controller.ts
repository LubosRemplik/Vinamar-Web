import { Controller, ForbiddenException, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { QueryBus } from '@nestjs/cqrs';
import { FindAvailabilityCalendarQuery } from '../../application/calendar/find-availability-calendar.query';
import { ExportCalendarFeedQuery } from '../../application/availability/export-calendar-feed.query';

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

  // Public iCal subscription feed of all reservations. Calendar apps (Google,
  // Apple) subscribe by URL and cannot send an Authorization header, so access
  // is gated by a high-entropy token in the query string (ICAL_FEED_TOKEN).
  // Empty token in env → feature disabled. passthrough:true lets the exception
  // filter render the 403.
  @Get('feed.ics')
  async feed(
    @Res({ passthrough: true }) res: Response,
    @Query('token') token?: string,
  ): Promise<string> {
    const expected = process.env.ICAL_FEED_TOKEN ?? '';
    if (!expected || token !== expected) {
      throw new ForbiddenException();
    }
    const ics = await this.queryBus.execute(new ExportCalendarFeedQuery());
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return ics;
  }
}
