import Hero from '@/components/Hero';
import Highlights from '@/components/Highlights';
import SectionTeaser from '@/components/SectionTeaser';
import TripCard from '@/components/TripCard';
import { readPage, getAllTrips } from '@/lib/content';

export default function Home() {
  const { data } = readPage('home.md');
  const highlights = (data.highlights as { icon: string; label: string }[]) ?? [];
  const trips = getAllTrips().slice(0, 3);

  return (
    <main>
      <Hero
        title={data.heroTitle as string}
        subtitle={data.heroSubtitle as string}
        image={data.heroImage as string}
      />
      <Highlights items={highlights} />
      <section className="flex flex-col md:flex-row gap-4 px-6">
        <SectionTeaser href="/okoli" title="Okolí" text="La Mata, solná jezera, Torrevieja" />
        <SectionTeaser href="/apartman" title="Apartmán" text="Prohlédněte si fotky a vybavení" />
      </section>
      <section className="px-6 mt-10">
        <h2 className="text-2xl mb-4">Tipy na výlety</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {trips.map((t) => (
            <TripCard key={t.slug} trip={t} />
          ))}
        </div>
      </section>
    </main>
  );
}
