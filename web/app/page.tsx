import Link from 'next/link';
import Hero from '@/components/Hero';
import Highlights, { type Amenity } from '@/components/Highlights';
import PhotoStrip from '@/components/PhotoStrip';
import Section from '@/components/Section';
import SectionHeading from '@/components/SectionHeading';
import TripCard from '@/components/TripCard';
import Container from '@/components/Container';
import { readPage, getAllTrips } from '@/lib/content';
import { SEASON_RATE, OFF_SEASON_RATE, CLEANING_FEE } from '@/lib/price';

const STRIP = [
  { src: '/images/apartment/living-01.jpg', alt: 'Obývací pokoj s rozkládacím gaučem' },
  { src: '/images/surroundings/beach-boardwalk.jpg', alt: 'Dřevěná lávka přes duny na pláž' },
  { src: '/images/pool/pool-day.jpg', alt: 'Bazén rezidence za dne' },
];

export default function Home() {
  const { data } = readPage('home.md');
  const amenities = (data.amenities as Amenity[]) ?? [];
  const trips = getAllTrips().slice(0, 3);

  return (
    <main>
      <Hero
        title={data.heroTitle as string}
        subtitle={data.heroSubtitle as string}
        image={data.heroImage as string}
        alt={data.heroAlt as string}
      />

      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-xl leading-relaxed text-ink/90 sm:text-2xl">
            {data.intro as string}
          </p>
          <hr className="rule mx-auto my-8" />
          <p className="eyebrow">
            {SEASON_RATE} € / noc v sezóně · {OFF_SEASON_RATE} € mimo sezónu · úklid {CLEANING_FEE}{' '}
            € za pobyt
          </p>
        </div>

        <div className="mt-20">
          <Highlights items={amenities} />
        </div>
      </Section>

      <PhotoStrip photos={STRIP} />

      <Section>
        <div className="grid gap-14 sm:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Apartmán a okolí" title="Kde budete bydlet" align="left" />
            <p className="mt-6 leading-relaxed text-ink/85">
              Obývací pokoj s rozkládacím gaučem, oddělená ložnice, kuchyňský kout a balkon se
              stolkem. Za rohem bazén, o pár set metrů dál pláž La Mata s dřevěnými lávkami přes
              duny.
            </p>
            <Link href="/apartman" className="btn btn-outline mt-8">
              Prohlédnout apartmán
            </Link>
          </div>
          <div>
            <SectionHeading eyebrow="Termíny" title="Kdy je volno" align="left" />
            <p className="mt-6 leading-relaxed text-ink/85">
              Kalendář ukazuje obsazenost na nejbližší měsíce dopředu. Vyberte termín a pošlete
              nezávaznou poptávku — ozveme se s potvrzením a podrobnostmi k předání klíčů.
            </p>
            <Link href="/volne-terminy" className="btn btn-solid mt-8">
              Volné termíny
            </Link>
          </div>
        </div>
      </Section>

      <Section className="border-t border-line">
        <SectionHeading eyebrow="Costa Blanca" title="Tipy na výlety" />
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {trips.map((t) => (
            <TripCard key={t.slug} trip={t} />
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href="/tipy-na-vylety" className="btn btn-outline">
            Všechny tipy
          </Link>
        </div>
      </Section>

      <section className="bg-ink py-20 text-center text-paper">
        <Container>
          <h2 className="text-paper">Podívejte se, kdy je volno</h2>
          <p className="mx-auto mt-4 max-w-lg text-paper/80">
            Poptávka je nezávazná — potvrdíme ji e-mailem a teprve pak se domlouváme na dalším.
          </p>
          <Link href="/volne-terminy" className="btn btn-light mt-9">
            Zobrazit volné termíny
          </Link>
        </Container>
      </section>
    </main>
  );
}
