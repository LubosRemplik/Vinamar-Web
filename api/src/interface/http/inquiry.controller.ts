import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
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
  constructor(private readonly commandBus: CommandBus, private readonly jwt: JwtService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateInquiryDto, @Headers('authorization') auth?: string) {
    const isAdmin = this.isAdminToken(auth);
    return this.commandBus.execute(
      new SubmitInquiryCommand(
        dto.guestName,
        dto.email,
        dto.arrival,
        dto.departure,
        dto.message,
        dto.phone,
        isAdmin,
      ),
    );
  }

  // The public endpoint stays public: a missing or invalid token simply means a
  // normal guest inquiry. A valid admin token elevates it to an admin booking.
  private isAdminToken(auth?: string): boolean {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) {
      return false;
    }
    try {
      this.jwt.verify(token, { secret: process.env.JWT_SECRET ?? 'change-me' });
      return true;
    } catch {
      return false;
    }
  }
}
