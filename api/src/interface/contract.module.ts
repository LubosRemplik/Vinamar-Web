import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GenerateContractHandler } from '../application/contract/generate-contract.handler';
import { GetContractPdfHandler } from '../application/contract/get-contract-pdf.handler';
import { GetContractPdfByInquiryHandler } from '../application/contract/get-contract-pdf-by-inquiry.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgContractRepository } from '../infrastructure/persistence/pg-contract.repository';
import { PgInquiryRepository } from '../infrastructure/persistence/pg-inquiry.repository';
import { PdfmakeContractRenderer } from '../infrastructure/pdf/pdfmake-contract-renderer';
import { SmtpContractNotifier } from '../infrastructure/notify/smtp-contract-notifier';
import { SystemClock } from '../infrastructure/time/system-clock';
import { CONTRACT_REPOSITORY } from '../domain/contract/contract.repository.port';
import { CONTRACT_PDF_RENDERER } from '../domain/contract/contract-pdf-renderer.port';
import { CONTRACT_NOTIFIER } from '../domain/contract/contract-notifier.port';
import { INQUIRY_REPOSITORY } from '../domain/inquiry/inquiry.repository.port';
import { CLOCK } from '../domain/shared/clock.port';

@Module({
  imports: [CqrsModule],
  providers: [
    GenerateContractHandler,
    GetContractPdfHandler,
    GetContractPdfByInquiryHandler,
    pgPoolProvider,
    { provide: CONTRACT_REPOSITORY, useClass: PgContractRepository },
    { provide: CONTRACT_PDF_RENDERER, useClass: PdfmakeContractRenderer },
    { provide: CONTRACT_NOTIFIER, useClass: SmtpContractNotifier },
    { provide: INQUIRY_REPOSITORY, useClass: PgInquiryRepository },
    { provide: CLOCK, useClass: SystemClock },
  ],
})
export class ContractModule {}
