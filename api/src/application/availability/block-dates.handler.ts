import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlockDatesCommand } from './block-dates.command';
import { DateRange } from '../../domain/shared/date-range';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';

@CommandHandler(BlockDatesCommand)
export class BlockDatesHandler implements ICommandHandler<BlockDatesCommand> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
  ) {}
  async execute(cmd: BlockDatesCommand): Promise<{ id: string }> {
    const block = await this.availability.save(
      new DateRange(new Date(cmd.arrival), new Date(cmd.departure)),
      'blocked',
    );
    return { id: block.id };
  }
}
