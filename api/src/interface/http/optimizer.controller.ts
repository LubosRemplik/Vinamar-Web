import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FindCheapestWindowsQuery } from '../../application/optimizer/find-cheapest-windows.query';

@Controller('optimizer')
export class OptimizerController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('cheapest-windows')
  find(
    @Query('origin') origin: string,
    @Query('nights') nights: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryBus.execute(
      new FindCheapestWindowsQuery(origin, Number(nights ?? 7), Number(limit ?? 10)),
    );
  }
}
