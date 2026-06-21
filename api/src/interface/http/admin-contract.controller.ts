import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Response } from 'express';
import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { AdminGuard } from './admin.guard';
import { GenerateContractCommand } from '../../application/contract/generate-contract.command';
import { GetContractPdfQuery } from '../../application/contract/get-contract-pdf.query';
import { GetContractPdfByInquiryQuery } from '../../application/contract/get-contract-pdf-by-inquiry.query';
import { ContractVariant } from '../../domain/contract/contract-variant';

class GenerateContractDto {
  @IsIn(['with-deposit', 'without-deposit']) variant!: ContractVariant;
  @IsString() guestAddress!: string;
  @IsString() guestIdNumber!: string;
  @IsOptional() @IsISO8601() guestBirthDate: string | null = null;
  @IsNumber() @IsPositive() totalPrice!: number;
  @IsOptional() @IsString() currency = 'EUR';

  @ValidateIf((o: GenerateContractDto) => o.variant === 'with-deposit')
  @IsNumber()
  @IsPositive()
  depositAmount: number | null = null;

  @IsOptional() @IsISO8601() depositDueDate: string | null = null;
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminContractController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('reservations/:inquiryId/contract')
  @HttpCode(201)
  generate(@Param('inquiryId') inquiryId: string, @Body() dto: GenerateContractDto) {
    return this.commandBus.execute(
      new GenerateContractCommand(
        inquiryId,
        dto.variant,
        dto.guestAddress,
        dto.guestIdNumber,
        dto.guestBirthDate,
        dto.totalPrice,
        dto.currency,
        dto.variant === 'with-deposit' ? dto.depositAmount : null,
        dto.variant === 'with-deposit' ? dto.depositDueDate : null,
      ),
    );
  }

  @Get('contracts/:id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const pdf = await this.queryBus.execute<GetContractPdfQuery, Buffer | null>(
      new GetContractPdfQuery(id),
    );
    this.sendPdf(res, pdf);
  }

  // The admin UI only knows the reservation (inquiry) id, so it downloads the
  // latest contract for that reservation without tracking the contract id.
  @Get('reservations/:inquiryId/contract/pdf')
  async pdfByInquiry(
    @Param('inquiryId') inquiryId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.queryBus.execute<GetContractPdfByInquiryQuery, Buffer | null>(
      new GetContractPdfByInquiryQuery(inquiryId),
    );
    this.sendPdf(res, pdf);
  }

  private sendPdf(res: Response, pdf: Buffer | null): void {
    if (!pdf) {
      throw new NotFoundException();
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="smlouva.pdf"');
    res.send(pdf);
  }
}
