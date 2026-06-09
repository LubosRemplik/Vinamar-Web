import { Pool } from 'pg';
import { PgAvailabilityRepository } from '../../src/infrastructure/persistence/pg-availability.repository';
import { DateRange } from '../../src/domain/shared/date-range';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';

describe('PgAvailabilityRepository (integration)', () => {
  const pool = new Pool({ connectionString: url });
  const repo = new PgAvailabilityRepository(pool);

  afterAll(async () => {
    await pool.query('DELETE FROM calendar_blocks');
    await pool.end();
  });

  it('saves and finds overlapping blocks', async () => {
    await pool.query('DELETE FROM calendar_blocks');
    await repo.save(new DateRange(new Date('2026-06-01'), new Date('2026-06-08')), 'blocked');
    const hit = await repo.findOverlapping(
      new DateRange(new Date('2026-06-05'), new Date('2026-06-12')),
    );
    const miss = await repo.findOverlapping(
      new DateRange(new Date('2026-07-01'), new Date('2026-07-08')),
    );
    expect(hit).not.toBeNull();
    expect(miss).toBeNull();
  });
});
