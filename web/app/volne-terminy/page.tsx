import type { Metadata } from 'next';
import CalendarWall from '@/components/CalendarWall';

export const metadata: Metadata = {
  title: 'Volné termíny — Vinamar',
};

export default function VolneTerminyPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <header className="mb-10 max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-terracotta">
          Dostupnost
        </p>
        <h1>Volné termíny</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/60">
          Podívejte se, kdy je apartmán v La Mata volný. Vyberte si termín přímo v kalendáři
          a pošlete nám nezávaznou poptávku.
        </p>
      </header>
      <CalendarWall />
    </main>
  );
}
