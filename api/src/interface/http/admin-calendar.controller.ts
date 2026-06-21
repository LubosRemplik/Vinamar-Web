import { Controller, Delete, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminGuard } from './admin.guard';
import { ListCalendarQuery } from '../../application/availability/list-calendar.query';
import { CancelCalendarEntryCommand } from '../../application/availability/cancel-calendar-entry.command';
import { ExportReservationIcsQuery } from '../../application/availability/export-reservation-ics.query';

@Controller('admin/calendar')
@UseGuards(AdminGuard)
export class AdminCalendarController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  list() {
    return this.queryBus.execute(new ListCalendarQuery());
  }

  // iCal export of a single reservation — opens in Google/Apple Calendar. The
  // browser fetches this with the admin Bearer token and saves the Blob, so the
  // standard AdminGuard applies (no token-in-URL). passthrough:true keeps Nest's
  // exception filter in play for the NotFound case.
  @Get(':id/ics')
  async exportIcs(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<string> {
    const ics = await this.queryBus.execute(new ExportReservationIcsQuery(id));
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rezervace-${id}.ics"`);
    return ics;
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.commandBus.execute(new CancelCalendarEntryCommand(id));
  }
}
