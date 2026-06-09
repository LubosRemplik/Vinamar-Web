import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminGuard } from './admin.guard';
import { ListInquiriesQuery } from '../../application/inquiry/list-inquiries.query';
import { ConfirmInquiryCommand } from '../../application/inquiry/confirm-inquiry.command';
import { DeclineInquiryCommand } from '../../application/inquiry/decline-inquiry.command';

@Controller('admin/inquiries')
@UseGuards(AdminGuard)
export class AdminInquiryController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  list() {
    return this.queryBus.execute(new ListInquiriesQuery());
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.commandBus.execute(new ConfirmInquiryCommand(id));
  }

  @Post(':id/decline')
  decline(@Param('id') id: string) {
    return this.commandBus.execute(new DeclineInquiryCommand(id));
  }
}
