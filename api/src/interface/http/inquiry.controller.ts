import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SubmitInquiryCommand } from '../../application/inquiry/submit-inquiry.command';

// Mirror of the client-side rule: forbid angle brackets and non-printable control
// characters (tab/LF/CR stay allowed) so the optional message is safe to store.
// eslint-disable-next-line no-control-regex -- intentionally forbids control chars
const MESSAGE_ALLOWED = /^[^<>\x00-\x08\x0B\x0C\x0E-\x1F\x7F]*$/;

class CreateInquiryDto {
  @IsString() guestName!: string;
  @IsEmail() email!: string;
  @IsISO8601() arrival!: string;
  @IsISO8601() departure!: string;
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Zpráva může mít nejvýše 500 znaků.' })
  @Matches(MESSAGE_ALLOWED, { message: 'Zpráva obsahuje nepovolené znaky.' })
  message = '';
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
