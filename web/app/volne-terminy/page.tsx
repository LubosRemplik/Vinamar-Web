import type { Metadata } from 'next';
import CalendarWall from '@/components/CalendarWall';
import Container from '@/components/Container';
import { SEASON_RATE, OFF_SEASON_RATE, CLEANING_FEE } from '@/lib/price';

export const metadata: Metadata = {
  title: 'Volné termíny — ViñaMar',
  description:
    'Kdy je apartmán v La Mata volný. Vyberte termín v kalendáři a pošlete nezávaznou poptávku.',
};

export default function VolneTerminyPage() {
  return (
    <main>
      <Container className="py-16 sm:py-24">
        <header className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-4">Dostupnost</p>
          <h1>Volné termíny</h1>
          <hr className="rule mx-auto my-8" />
          <p className="font-display text-xl leading-relaxed text-ink/90">
            Podívejte se, kdy je apartmán v La Mata volný. Vyberte si termín přímo v kalendáři
            a pošlete nám nezávaznou poptávku.
          </p>
          {/* Non-breaking spaces keep each amount glued to its currency sign when
              the line wraps. */}
          <p className="eyebrow mt-8">
            {SEASON_RATE}&nbsp;€ / noc v sezóně (červen–září) · {OFF_SEASON_RATE}&nbsp;€ mimo sezónu
            · úklid {CLEANING_FEE}&nbsp;€ za pobyt
          </p>
        </header>

        <div className="mt-16">
          <CalendarWall />
        </div>
      </Container>
    </main>
  );
}
