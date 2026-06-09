import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CheckHealthQuery } from './check-health.query';
import {
  DB_HEALTH_CHECKER,
  DbHealthChecker,
} from '../../domain/health/db-health-checker.port';
import { HealthStatus } from '../../domain/health/health-status';

@QueryHandler(CheckHealthQuery)
export class CheckHealthHandler
  implements IQueryHandler<CheckHealthQuery, HealthStatus>
{
  constructor(
    @Inject(DB_HEALTH_CHECKER) private readonly checker: DbHealthChecker,
  ) {}

  async execute(_query: CheckHealthQuery): Promise<HealthStatus> {
    const ok = await this.checker.ping();
    return new HealthStatus(ok ? 'ok' : 'down', new Date());
  }
}
