import { Pool } from 'pg';
import { PgFlightQuoteRepository } from '../../src/infrastructure/flight/pg-flight-quote.repository';
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';
import { FlightQuote } from '../../src/domain/flight/flight-quote';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';
const q = (origin: Origin, amount: number, day: string) =>
  new FlightQuote(origin, new Date(day), new Date(day), new Money(amount), 'FR', 'x', new Date());

// DELETEs flight_quotes; skipped unless opted in (CI sets RUN_DB_INTEGRATION=1) so
// it never touches a developer's local dev database. See pg-availability spec.
const dbDescribe = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

dbDescribe('PgFlightQuoteRepository (integration)', () => {
  const pool = new Pool({ connectionString: url });
  const repo = new PgFlightQuoteRepository(pool);

  afterAll(async () => {
    await pool.query('DELETE FROM flight_quotes');
    await pool.end();
  });

  it('replaces per origin and returns the cheapest per origin', async () => {
    await pool.query('DELETE FROM flight_quotes');
    const wro = Origin.fromCode('WRO');
    await repo.replaceForOrigin(wro, [q(wro, 90, '2026-05-01'), q(wro, 58, '2026-05-08')]);
    await repo.replaceForOrigin(wro, [q(wro, 70, '2026-06-01')]); // replace wipes the old rows
    const cheapest = await repo.cheapestPerOrigin();
    expect(cheapest).toHaveLength(1);
    expect(cheapest[0].price.amount).toBe(70);
  });
});
