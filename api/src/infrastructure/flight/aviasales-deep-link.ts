export function buildDeepLink(relativeLink: string, marker: string): string {
  const base = relativeLink.startsWith('http')
    ? relativeLink
    : `https://www.aviasales.com${relativeLink}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}marker=${encodeURIComponent(marker)}`;
}
