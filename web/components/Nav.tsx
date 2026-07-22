'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminToken } from '@/lib/admin';
import Container from './Container';
import Logo from './Logo';

const links = [
  { href: '/volne-terminy', label: 'Volné termíny' },
  { href: '/apartman', label: 'Apartmán a okolí' },
  { href: '/tipy-na-vylety', label: 'Tipy na výlety' },
  { href: '/z-letiste', label: 'Z letiště' },
];

const LINK = 'text-[12px] uppercase tracking-[0.12em] text-ink/90 hover:text-ink transition-colors';

export default function Nav() {
  const [open, setOpen] = useState(false);
  // Admin token lives in localStorage, so this resolves client-side only — the
  // Administrace link appears just for a logged-in owner, never for visitors.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    setIsAdmin(Boolean(getAdminToken()));
  }, []);

  return (
    <header className="border-b border-line bg-paper">
      <Container className="flex items-center justify-between py-5">
        <Link href="/" onClick={() => setOpen(false)} aria-label="ViñaMar — domů">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={LINK}>
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className={`${LINK} text-brass`}>
              Administrace
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="-mr-2 inline-flex items-center justify-center p-2 text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-ink md:hidden"
          aria-label={open ? 'Zavřít menu' : 'Otevřít menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M3 7h18" />
                <path d="M3 12h18" />
                <path d="M3 17h18" />
              </>
            )}
          </svg>
        </button>
      </Container>

      {open && (
        <nav id="mobile-menu" className="border-t border-line md:hidden">
          <Container className="pb-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block border-b border-line/60 py-4 text-sm uppercase tracking-[0.12em] text-ink/80 last:border-0"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="block border-b border-line/60 py-4 text-sm uppercase tracking-[0.12em] text-brass last:border-0"
                onClick={() => setOpen(false)}
              >
                Administrace
              </Link>
            )}
          </Container>
        </nav>
      )}
    </header>
  );
}
