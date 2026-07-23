import Link from 'next/link';
import Container from './Container';
import Logo from './Logo';

const links = [
  { href: '/volne-terminy', label: 'Volné termíny' },
  { href: '/apartman', label: 'Apartmán a okolí' },
  { href: '/tipy-na-vylety', label: 'Tipy na výlety' },
  { href: '/z-letiste', label: 'Z letiště' },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <Container className="py-14">
        <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <Logo size="lg" subtitle />
          <nav className="flex flex-wrap justify-center gap-x-7 gap-y-3 sm:justify-end">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] uppercase tracking-[0.12em] text-ink/90 hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-center text-xs text-sage">
          ViñaMar · La Mata, Torrevieja · {new Date().getFullYear()}
        </p>
      </Container>
    </footer>
  );
}
