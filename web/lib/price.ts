// Nightly rates: high season is June–September, off-season the rest of the year.
export const SEASON_RATE = 110; // € / noc, červen–září (závěrečný úklid v ceně)
export const OFF_SEASON_RATE = 80; // € / noc, zbytek roku (závěrečný úklid v ceně)

const SEASON_MONTHS = new Set([6, 7, 8, 9]);

function nightlyRate(date: Date): number {
  return SEASON_MONTHS.has(date.getUTCMonth() + 1) ? SEASON_RATE : OFF_SEASON_RATE;
}

// Sums the per-night rate for each night of the stay (arrival..departure-1),
// so a stay that crosses the season boundary is priced correctly.
export function totalPrice(arrival: string, departure: string): number {
  let total = 0;
  for (let t = Date.parse(arrival); t < Date.parse(departure); t += 86_400_000) {
    total += nightlyRate(new Date(t));
  }
  return total;
}
