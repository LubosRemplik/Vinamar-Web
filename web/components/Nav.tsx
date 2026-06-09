import Link from 'next/link';

const links = [
  { href: '/apartman', label: 'Apartmán' },
  { href: '/okoli', label: 'Okolí' },
  { href: '/tipy-na-vylety', label: 'Tipy na výlety' },
  { href: '/letenky', label: 'Letenky' },
  { href: '/najit-terminy', label: 'Najít termíny' },
];

export default function Nav() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-sand border-b border-ochre/40">
      <Link href="/" className="text-2xl font-display text-terracotta">
        Vinamar
      </Link>
      <nav className="flex gap-5 items-center">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-terracotta">
            {l.label}
          </Link>
        ))}
        <Link href="/rezervace" className="hover:text-terracotta">
          Rezervace
        </Link>
      </nav>
    </header>
  );
}
