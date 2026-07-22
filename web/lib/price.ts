// Nightly rates: high season is June–September, off-season the rest of the year.
export const SEASON_RATE = 100; // € / noc, červen–září
export const OFF_SEASON_RATE = 70; // € / noc, zbytek roku
export const CLEANING_FEE = 70; // € jednorázově za pobyt (závěrečný úklid)

const SEASON_MONTHS = new Set([6, 7, 8, 9]);

function nightlyRate(date: Date): number {
  return SEASON_MONTHS.has(date.getUTCMonth() + 1) ? SEASON_RATE : OFF_SEASON_RATE;
}

// Sums the per-night rate for each night of the stay (arrival..departure-1),
// so a stay that crosses the season boundary is priced correctly.
export function accommodationPrice(arrival: string, departure: string): number {
  let total = 0;
  for (let t = Date.parse(arrival); t < Date.parse(departure); t += 86_400_000) {
    total += nightlyRate(new Date(t));
  }
  return total;
}

// What the guest actually pays: nights plus the one-off cleaning fee.
export function totalPrice(arrival: string, departure: string): number {
  return accommodationPrice(arrival, departure) + CLEANING_FEE;
}
