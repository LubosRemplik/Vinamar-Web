// Dev fixtures: occupy a few summer 2026 terms so the booking flow can be exercised
// against real "taken" dates while leaving plenty of bookable gaps. Idempotent.
import pg from 'pg';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';
const pool = new pg.Pool({ connectionString: url });

// [arrival, departure) — checkout-exclusive, same convention as calendar_blocks.
const SUMMER_2026 = [
  ['2026-07-06', '2026-07-13'],
  ['2026-07-20', '2026-07-27'],
  ['2026-08-10', '2026-08-17'],
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
