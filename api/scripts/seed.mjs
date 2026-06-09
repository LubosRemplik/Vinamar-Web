// Dev fixtures: occupy a few summer 2026 terms so the booking flow can be exercised
// against real "taken" dates while leaving plenty of bookable gaps. Idempotent.
import pg from 'pg';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';
const pool = new pg.Pool({ connectionString: url });

// [arrival, departure) — checkout-exclusive, same convention as calendar_blocks.
// Gaps between terms are 9 nights so a standard 7-night stay can be booked between
// them (check in on the previous term's checkout day, leaving a <=2 night turnover
// before the next term) without ever creating an unbookable 3-6 night orphan gap.
const SUMMER_2026 = [
  ['2026-07-06', '2026-07-13'],
  ['2026-07-22', '2026-07-29'],
  ['2026-08-07', '2026-08-14'],
];

async function main() {
  await pool.query(
    `DELETE FROM calendar_blocks
     WHERE reason = 'booked' AND start_date >= '2026-06-01' AND end_date <= '2026-09-30'`,
  );
  for (const [start, end] of SUMMER_2026) {
    await pool.query(
      `INSERT INTO calendar_blocks (start_date, end_date, reason) VALUES ($1, $2, 'booked')`,
      [start, end],
    );
  }
  const { rows } = await pool.query(
    `SELECT to_char(start_date, 'YYYY-MM-DD') AS start, to_char(end_date, 'YYYY-MM-DD') AS end, reason
     FROM calendar_blocks ORDER BY start_date`,
  );
  console.log(`Seeded ${SUMMER_2026.length} summer blocks. calendar_blocks now:`);
  console.table(rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
