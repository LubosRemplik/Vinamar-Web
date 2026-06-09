import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnblockDatesCommand } from './unblock-dates.command';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';

@CommandHandler(UnblockDatesCommand)
export class UnblockDatesHandler implements ICommandHandler<UnblockDatesCommand> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
  ) {}
  async execute(cmd: UnblockDatesCommand): Promise<void> {
    await this.availability.delete(cmd.id);
  }
}
