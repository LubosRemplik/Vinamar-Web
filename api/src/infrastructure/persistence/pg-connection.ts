import { Pool, types } from 'pg';
import { databaseUrl } from '../config/database.config';

export const PG_POOL = Symbol('PG_POOL');

const DATE_OID = 1082;

const parseDateAsUtcMidnight = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export const pgPoolProvider = {
  provide: PG_POOL,
  useFactory: (): Pool =>
    new Pool({
      connectionString: databaseUrl(),
      types: {
        getTypeParser: ((oid: number, format?: unknown) =>
          oid === DATE_OID
            ? parseDateAsUtcMidnight
            : types.getTypeParser(oid, format as never)) as typeof types.getTypeParser,
      },
    }),
};
