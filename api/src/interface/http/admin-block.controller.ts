import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IsISO8601 } from 'class-validator';
import { AdminGuard } from './admin.guard';
import { GetAvailabilityQuery } from '../../application/availability/get-availability.query';
import { BlockDatesCommand } from '../../application/availability/block-dates.command';
import { UnblockDatesCommand } from '../../application/availability/unblock-dates.command';

class BlockDto {
  @IsISO8601() arrival!: string;
  @IsISO8601() departure!: string;
}

@Controller('admin/blocks')
@UseGuards(AdminGuard)
export class AdminBlockController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  list(@Query('from') from: string, @Query('to') to: string) {
    return this.queryBus.execute(new GetAvailabilityQuery(from, to));
  }

  @Post()
  block(@Body() dto: BlockDto) {
    return this.commandBus.execute(new BlockDatesCommand(dto.arrival, dto.departure));
  }

  @Delete(':id')
  unblock(@Param('id') id: string) {
    return this.commandBus.execute(new UnblockDatesCommand(id));
  }
}
