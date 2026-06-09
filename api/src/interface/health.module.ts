import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthController } from './http/health.controller';
import { CheckHealthHandler } from '../application/health/check-health.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgHealthChecker } from '../infrastructure/persistence/pg-health-checker';
import { DB_HEALTH_CHECKER } from '../domain/health/db-health-checker.port';

@Module({
  imports: [CqrsModule],
  controllers: [HealthController],
  providers: [
    CheckHealthHandler,
    pgPoolProvider,
    { provide: DB_HEALTH_CHECKER, useClass: PgHealthChecker },
  ],
})
export class HealthModule {}
