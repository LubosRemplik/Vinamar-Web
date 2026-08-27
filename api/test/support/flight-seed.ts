import { Pool } from 'pg';

export interface FutureBlock {
  year: number;
  month: number;
  start: string;
  end: string;
}

/** First half of a month `monthsAhead` from now — always inside the 12-month
 *  calendar window, unlike a hardcoded date that drifts into the past. */
export function futureBlock(monthsAhead = 3): FutureBlock {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsAhead);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return { year, month, start: `${prefix}-01`, end: `${prefix}-15` };
}

/** Seed weekly round-trip quotes starting a month from now. The app's
 *  fire-and-forget bootstrap refresh may also be writing quotes for this
 *  origin, so conflicts are ignored — either data set satisfies the tests. */
export async function seedFlightQuotes(pool: Pool, origin: string, weeks = 12): Promise<void> {
  const first = new Date();
  first.setUTCHours(0, 0, 0, 0);
  first.setUTCDate(first.getUTCDate() + 30);
  for (let w = 0; w < weeks; w++) {
    const departure = new Date(first);
    departure.setUTCDate(first.getUTCDate() + w * 7);
    const ret = new Date(departure);
    ret.setUTCDate(departure.getUTCDate() + 7);
    await pool.query(
      `INSERT INTO flight_quotes (origin, departure_date, return_date, price_amount, airline, deep_link)
       VALUES ($1, $2, $3, $4, 'FR', '')
       ON CONFLICT (origin, departure_date) DO NOTHING`,
      [origin, departure, ret, 60 + ((w * 7) % 40)],
    );
  }
}
