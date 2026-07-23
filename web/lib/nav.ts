export interface NavLink {
  href: string;
  label: string;
}

// One source of truth for the header and the footer, in the order the owner
// wants visitors to read them.
export const NAV_LINKS: NavLink[] = [
  { href: '/apartman', label: 'Apartmán a okolí' },
  { href: '/volne-terminy', label: 'Volné termíny' },
  { href: '/z-letiste', label: 'Z letiště' },
  { href: '/tipy-na-vylety', label: 'Tipy na výlety' },
];

// A trip detail (/tipy-na-vylety/tabarca) keeps its section marked as current.
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
