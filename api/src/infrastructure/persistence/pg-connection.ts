import { Pool } from 'pg';
import { databaseUrl } from '../config/database.config';

export const PG_POOL = Symbol('PG_POOL');

export const pgPoolProvider = {
  provide: PG_POOL,
  useFactory: (): Pool => new Pool({ connectionString: databaseUrl() }),
};
