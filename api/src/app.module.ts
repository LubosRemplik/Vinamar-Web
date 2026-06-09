import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './interface/health.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule],
})
export class AppModule {}
