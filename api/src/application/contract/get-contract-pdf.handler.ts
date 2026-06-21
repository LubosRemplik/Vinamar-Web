import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetContractPdfQuery } from './get-contract-pdf.query';
import {
  CONTRACT_REPOSITORY,
  ContractRepository,
} from '../../domain/contract/contract.repository.port';

@QueryHandler(GetContractPdfQuery)
export class GetContractPdfHandler implements IQueryHandler<GetContractPdfQuery> {
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contracts: ContractRepository,
  ) {}

  async execute(query: GetContractPdfQuery): Promise<Buffer | null> {
    const found = await this.contracts.get(query.id);
    return found ? found.pdf : null;
  }
}
