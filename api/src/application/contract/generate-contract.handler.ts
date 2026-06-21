import { Inject, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { GenerateContractCommand } from './generate-contract.command';
import { Contract, CONTRACT_NIGHTS } from '../../domain/contract/contract';
import { DateRange } from '../../domain/shared/date-range';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';
import {
  CONTRACT_REPOSITORY,
  ContractRepository,
} from '../../domain/contract/contract.repository.port';
import {
  CONTRACT_PDF_RENDERER,
  ContractPdfRenderer,
} from '../../domain/contract/contract-pdf-renderer.port';
import {
  CONTRACT_NOTIFIER,
  ContractNotifier,
} from '../../domain/contract/contract-notifier.port';
import { CLOCK, Clock } from '../../domain/shared/clock.port';
import { InquiryNotConfirmedError } from '../../domain/contract/errors/inquiry-not-confirmed.error';
import { ContractAlreadySentError } from '../../domain/contract/errors/contract-already-sent.error';

const MS_PER_NIGHT = 1000 * 60 * 60 * 24;

@CommandHandler(GenerateContractCommand)
export class GenerateContractHandler implements ICommandHandler<GenerateContractCommand> {
  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(CONTRACT_REPOSITORY) private readonly contracts: ContractRepository,
    @Inject(CONTRACT_PDF_RENDERER) private readonly renderer: ContractPdfRenderer,
    @Inject(CONTRACT_NOTIFIER) private readonly notifier: ContractNotifier,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() private readonly idFactory: () => string = randomUUID,
  ) {}

  async execute(cmd: GenerateContractCommand): Promise<{ id: string }> {
    const inquiry = await this.inquiries.get(cmd.inquiryId);
    if (!inquiry) {
      throw new Error('inquiry not found');
    }
    // Duplicate guard before the status gate: once a contract is sent the inquiry
    // moves to 'contract_sent', so this surfaces the more informative error.
    if (await this.contracts.existsForInquiry(cmd.inquiryId)) {
      throw new ContractAlreadySentError();
    }
    if (inquiry.status !== 'confirmed') {
      throw new InquiryNotConfirmedError();
    }

    // Every contract covers exactly 10 nights from the reservation's arrival,
    // regardless of the inquiry's own length (Comunidad Valenciana temporada rule).
    const arrival = inquiry.range.arrival;
    const departure = new Date(arrival.getTime() + CONTRACT_NIGHTS * MS_PER_NIGHT);
    const now = this.clock.now();

    const contract = Contract.create({
      id: this.idFactory(),
      inquiryId: inquiry.id,
      variant: cmd.variant,
      guestName: inquiry.guestName,
      guestAddress: cmd.guestAddress,
      guestIdNumber: cmd.guestIdNumber,
      guestBirthDate: cmd.guestBirthDate ? new Date(cmd.guestBirthDate) : null,
      range: new DateRange(arrival, departure),
      totalPrice: cmd.totalPrice,
      currency: cmd.currency,
      depositAmount: cmd.depositAmount,
      depositDueDate: cmd.depositDueDate ? new Date(cmd.depositDueDate) : null,
      now,
    });

    const pdf = await this.renderer.render(contract);
    await this.contracts.save(contract, pdf);
    await this.notifier.sendToGuest(contract, inquiry.email.value, pdf);
    await this.contracts.markSent(contract.id, now);
    await this.inquiries.updateStatus(inquiry.id, 'contract_sent');

    return { id: contract.id };
  }
}
