import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString } from 'class-validator';
import { adminCredentialsValid } from '../../infrastructure/auth/admin-credentials';

class LoginDto {
  @IsString() username!: string;
  @IsString() password!: string;
}

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly jwt: JwtService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    if (!adminCredentialsValid(dto.username, dto.password)) {
      throw new UnauthorizedException();
    }
    const token = this.jwt.sign(
      { sub: dto.username },
      { secret: process.env.JWT_SECRET ?? 'change-me', expiresIn: '12h' },
    );
    return { token };
  }
}
