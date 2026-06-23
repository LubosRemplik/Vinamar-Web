import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminGuard } from './admin.guard';
import { ListCalendarQuery } from '../../application/availability/list-calendar.query';
import { CancelCalendarEntryCommand } from '../../application/availability/cancel-calendar-entry.command';

@Controller('admin/calendar')
@UseGuards(AdminGuard)
export class AdminCalendarController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  list() {
    return this.queryBus.execute(new ListCalendarQuery());
  }

  // The subscribable iCal feed URL (with its secret token) for the owner to paste
  // into Google/Apple Calendar. Returned only to an authenticated admin so the
  // token never ships in the client bundle. url is null when the feed is not
  // configured (ICAL_FEED_TOKEN unset).
  @Get('feed-url')
  feedUrl(): { url: string | null } {
    const token = process.env.ICAL_FEED_TOKEN ?? '';
    if (!token) {
      return { url: null };
    }
    const base = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
    return { url: `${base}/api/calendar/feed.ics?token=${encodeURIComponent(token)}` };
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.commandBus.execute(new CancelCalendarEntryCommand(id));
  }
}
