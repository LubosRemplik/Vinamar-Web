import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import { SendArrivalRemindersCommand } from '../../application/inquiry/send-arrival-reminders.command';

@Injectable()
export class ArrivalReminderCron {
  constructor(private readonly commandBus: CommandBus) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async daily(): Promise<void> {
    await this.commandBus.execute(new SendArrivalRemindersCommand());
  }
}
