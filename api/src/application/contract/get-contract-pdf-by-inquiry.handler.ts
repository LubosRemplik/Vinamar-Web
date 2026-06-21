import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetContractPdfByInquiryQuery } from './get-contract-pdf-by-inquiry.query';
import {
  CONTRACT_REPOSITORY,
  ContractRepository,
} from '../../domain/contract/contract.repository.port';

@QueryHandler(GetContractPdfByInquiryQuery)
export class GetContractPdfByInquiryHandler
  implements IQueryHandler<GetContractPdfByInquiryQuery>
{
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contracts: ContractRepository,
  ) {}

  async execute(query: GetContractPdfByInquiryQuery): Promise<Buffer | null> {
    return this.contracts.latestPdfForInquiry(query.inquiryId);
  }
}
