'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAdminToken } from '@/lib/admin';
import { NAV_LINKS, isCurrent } from '@/lib/nav';
import Container from './Container';
import Logo from './Logo';

const LINK = 'text-[13px] uppercase tracking-[0.12em] transition-colors';

// The current page is marked twice over — full-strength ink and a brass rule —
// so it does not rely on colour alone.
const DESKTOP_REST = 'border-b border-transparent pb-1 text-ink/70 hover:text-ink';
const DESKTOP_CURRENT = 'border-b border-brass pb-1 text-ink';

const MOBILE_REST = 'border-l-2 border-transparent pl-4 text-ink/70';
const MOBILE_CURRENT = 'border-l-2 border-brass pl-4 text-ink';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '';
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
          {NAV_LINKS.map((l) => {
            const current = isCurrent(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? 'page' : undefined}
                className={`${LINK} ${current ? DESKTOP_CURRENT : DESKTOP_REST}`}
              >
                {l.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin" className={`${LINK} text-brass hover:text-ink`}>
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
          <Container className="py-2">
            {NAV_LINKS.map((l) => {
              const current = isCurrent(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={current ? 'page' : undefined}
                  className={`block py-4 text-sm uppercase tracking-[0.12em] ${
                    current ? MOBILE_CURRENT : MOBILE_REST
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`block py-4 pl-4 text-sm uppercase tracking-[0.12em] text-brass`}
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
