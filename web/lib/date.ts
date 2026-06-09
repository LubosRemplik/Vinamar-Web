// Formats an ISO date (YYYY-MM-DD) as a Czech short date, e.g. "15. 6. 2026".
export function formatCzDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${Number(day)}. ${Number(month)}. ${year}`;
}
