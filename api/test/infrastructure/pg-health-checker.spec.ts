import { Pool } from 'pg';
import { PgHealthChecker } from '../../src/infrastructure/persistence/pg-health-checker';

const url =
  process.env.DATABASE_URL ??
  'postgres://vinamar:vinamar@localhost:5432/vinamar';

describe('PgHealthChecker (integration)', () => {
  it('returns true against a reachable database', async () => {
    const pool = new Pool({ connectionString: url });
    const checker = new PgHealthChecker(pool);
    await expect(checker.ping()).resolves.toBe(true);
    await pool.end();
  });

  it('returns false against an unreachable database', async () => {
    const pool = new Pool({
      connectionString: 'postgres://nobody:nobody@localhost:1/none',
    });
    const checker = new PgHealthChecker(pool);
    await expect(checker.ping()).resolves.toBe(false);
    await pool.end();
  });
});
