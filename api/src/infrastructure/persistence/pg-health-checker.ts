import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DbHealthChecker } from '../../domain/health/db-health-checker.port';
import { PG_POOL } from './pg-connection';

@Injectable()
export class PgHealthChecker implements DbHealthChecker {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
