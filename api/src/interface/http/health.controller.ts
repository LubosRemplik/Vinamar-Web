import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CheckHealthQuery } from '../../application/health/check-health.query';
import { HealthStatus } from '../../domain/health/health-status';
import { DatabaseUnavailableError } from '../../domain/health/database-unavailable.error';

@Controller('health')
export class HealthController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async health() {
    const status = await this.queryBus.execute<CheckHealthQuery, HealthStatus>(
      new CheckHealthQuery(),
    );
    if (!status.isHealthy) {
      throw new DatabaseUnavailableError();
    }
    return {
      status: 'ok',
      db: status.database,
      timestamp: status.checkedAt.toISOString(),
    };
  }
}
