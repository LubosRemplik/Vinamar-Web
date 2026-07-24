import type { Metadata } from 'next';
import TripCard from '@/components/TripCard';
import Section from '@/components/Section';
import { getAllTrips } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Tipy na výlety — ViñaMar',
  description:
    'Kam vyrazit z La Maty: solná jezera, Torrevieja, Guardamar, Tabarca, Elche, Alicante, Murcia i Cartagena.',
};

export default function TripsList() {
  const trips = getAllTrips();

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-4">Costa Blanca</p>
          <h1>Tipy na výlety</h1>
          <hr className="rule mx-auto my-8" />
          <p className="font-display text-xl leading-relaxed text-ink/90">
            Od solných jezer a trhů za rohem po římskou Cartagenu — kam se vydat na výlet z La
            Maty.
          </p>
        </div>

        <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <TripCard key={t.slug} trip={t} />
          ))}
        </div>
      </Section>
    </main>
  );
}
