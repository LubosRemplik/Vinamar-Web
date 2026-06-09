import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IsEmail, IsISO8601, IsOptional, IsString } from 'class-validator';
import { SubmitInquiryCommand } from '../../application/inquiry/submit-inquiry.command';

class CreateInquiryDto {
  @IsString() guestName!: string;
  @IsEmail() email!: string;
  @IsISO8601() arrival!: string;
  @IsISO8601() departure!: string;
  @IsOptional() @IsString() message = '';
  @IsOptional() @IsString() phone = '';
}

@Controller('inquiries')
export class InquiryController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateInquiryDto) {
    return this.commandBus.execute(
      new SubmitInquiryCommand(
        dto.guestName,
        dto.email,
        dto.arrival,
        dto.departure,
        dto.message,
        dto.phone,
      ),
    );
  }
}
