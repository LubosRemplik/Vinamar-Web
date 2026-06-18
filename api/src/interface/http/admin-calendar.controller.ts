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

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.commandBus.execute(new CancelCalendarEntryCommand(id));
  }
}
