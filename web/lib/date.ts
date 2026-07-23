// Formats an ISO date (YYYY-MM-DD) as a Czech short date, e.g. "15. 6. 2026".
export function formatCzDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${Number(day)}. ${Number(month)}. ${year}`;
}

// Number of nights between arrival and departure (both ISO YYYY-MM-DD).
export function nightsBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

// Czech plural for a night count: 1 noc, 2–4 noci, 5+ nocí.
export function formatNights(n: number): string {
  if (n === 1) return '1 noc';
  if (n >= 2 && n <= 4) return `${n} noci`;
  return `${n} nocí`;
}
