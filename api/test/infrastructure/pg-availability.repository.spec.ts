import { Pool } from 'pg';
import { PgAvailabilityRepository } from '../../src/infrastructure/persistence/pg-availability.repository';
import { DateRange } from '../../src/domain/shared/date-range';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';

describe('PgAvailabilityRepository (integration)', () => {
  const pool = new Pool({ connectionString: url });
  const repo = new PgAvailabilityRepository(pool);

  const reset = async () => {
    await pool.query('DELETE FROM calendar_blocks');
    await pool.query('DELETE FROM inquiries');
  };

  afterAll(async () => {
    await reset();
    await pool.end();
  });

  it('saves and finds overlapping blocks', async () => {
    await reset();
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

  it('saves a booked block linked to an inquiry and lists it with guest details', async () => {
    await reset();
    const { rows } = await pool.query(
      `INSERT INTO inquiries (guest_name, email, phone, arrival, departure, status)
       VALUES ('Jan Novák', 'jan@x.cz', '+420 123', '2026-08-01', '2026-08-05', 'confirmed')
       RETURNING id`,
    );
    const inquiryId = rows[0].id as string;
    await repo.save(new DateRange(new Date('2026-08-01'), new Date('2026-08-05')), 'booked', {
      inquiryId,
    });

    const entries = await repo.listEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      reason: 'booked',
      inquiryId,
      guestName: 'Jan Novák',
      email: 'jan@x.cz',
      phone: '+420 123',
    });
  });

  it('delete returns the linked inquiryId', async () => {
    await reset();
    const { rows } = await pool.query(
      `INSERT INTO inquiries (guest_name, email, arrival, departure, status)
       VALUES ('A', 'a@x.cz', '2026-09-01', '2026-09-05', 'confirmed') RETURNING id`,
    );
    const inquiryId = rows[0].id as string;
    const block = await repo.save(
      new DateRange(new Date('2026-09-01'), new Date('2026-09-05')),
      'booked',
      { inquiryId },
    );

    const blockResult = await repo.delete(block.id);
    const noteResult = await repo.delete('00000000-0000-0000-0000-000000000000');
    expect(blockResult.inquiryId).toBe(inquiryId);
    expect(noteResult.inquiryId).toBeNull();
  });
});
