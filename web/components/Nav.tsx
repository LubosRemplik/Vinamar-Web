'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminToken } from '@/lib/admin';

const links = [
  { href: '/volne-terminy', label: 'Volné termíny' },
  { href: '/apartman', label: 'Apartmán' },
  { href: '/okoli', label: 'Okolí' },
  { href: '/tipy-na-vylety', label: 'Tipy na výlety' },
  { href: '/z-letiste', label: 'Z letiště' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  // Admin token lives in localStorage, so this resolves client-side only — the
  // Administrace link appears just for a logged-in owner, never for visitors.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    setIsAdmin(Boolean(getAdminToken()));
  }, []);

  return (
    <header className="bg-sand border-b border-ochre/40">
      <div className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-display text-terracotta"
          onClick={() => setOpen(false)}
        >
          Vinamar
        </Link>

        <nav className="hidden md:flex gap-5 items-center">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-terracotta">
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className="font-medium text-sea hover:text-sea/80">
              Administrace
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 -mr-2 text-ink hover:bg-ochre/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
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
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" className="md:hidden border-t border-ochre/30 px-6 pb-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-3 text-lg hover:text-terracotta border-b border-ochre/15 last:border-0"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="block py-3 text-lg font-medium text-sea hover:text-sea/80 border-b border-ochre/15 last:border-0"
              onClick={() => setOpen(false)}
            >
              Administrace
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
