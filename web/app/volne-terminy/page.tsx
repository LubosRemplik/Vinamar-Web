import type { Metadata } from 'next';
import CalendarWall from '@/components/CalendarWall';
import { SEASON_RATE, OFF_SEASON_RATE } from '@/lib/price';

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
        <p className="mt-4 inline-flex flex-wrap gap-x-2 rounded-xl bg-sand/60 px-4 py-2 text-sm text-ink/70">
          <span className="font-medium text-ink">Cena za noc:</span>
          <span>{SEASON_RATE} € v sezóně (červen–září),</span>
          <span>{OFF_SEASON_RATE} € mimo sezónu.</span>
        </p>
      </header>
      <CalendarWall />
    </main>
  );
}
