import type { Metadata } from 'next';
import Gallery, { type Photo } from '@/components/Gallery';
import Highlights, { type Amenity } from '@/components/Highlights';
import PhotoStrip from '@/components/PhotoStrip';
import Section from '@/components/Section';
import SectionHeading from '@/components/SectionHeading';
import { readPage, renderMarkdown } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Apartmán a okolí — ViñaMar',
  description:
    'Apartmán pro čtyři s bazénem v rezidenci, tři sta metrů od písečné pláže La Mata u Torreviejy.',
};

const POOL = [
  { src: '/images/pool/pool-day.jpg', alt: 'Bazén rezidence za dne' },
  { src: '/images/pool/residence.jpg', alt: 'Rezidence s bazénem' },
  { src: '/images/pool/pool-evening.jpg', alt: 'Osvětlený bazén za soumraku' },
];

export default async function Apartman() {
  const apartment = readPage('apartman.md');
  const surroundings = readPage('okoli.md');
  const apartmentHtml = await renderMarkdown(apartment.body);
  const surroundingsHtml = await renderMarkdown(surroundings.body);

  const gallery = (apartment.data.gallery as Photo[]) ?? [];
  const amenities = (apartment.data.amenities as Amenity[]) ?? [];
  const beachGallery = (surroundings.data.gallery as Photo[]) ?? [];

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-4">La Mata · Torrevieja</p>
          <h1>{apartment.data.title as string}</h1>
          <hr className="rule mx-auto my-8" />
          <p className="font-display text-xl leading-relaxed text-ink/90">
            {apartment.data.intro as string}
          </p>
        </div>

        <div className="mt-16">
          <Gallery photos={gallery} />
        </div>

        <div className="mx-auto mt-16 max-w-2xl prose-body">
          <div dangerouslySetInnerHTML={{ __html: apartmentHtml }} />
        </div>

        <div className="mt-20">
          <Highlights items={amenities} />
        </div>
      </Section>

      <PhotoStrip photos={POOL} />

      <Section>
        <SectionHeading eyebrow="Rezidence" title="Bazén za domem" />
        <p className="mx-auto mt-8 max-w-2xl text-center leading-relaxed text-ink/85">
          K rezidenci patří společný bazén s dlážděnou terasou a lehátky. Otevřený je přes den
          i večer, kdy se rozsvítí a je u něj nejpříjemněji.
        </p>
      </Section>

      <Section className="border-t border-line" id="okoli">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-4">Okolí</p>
          <h2>{surroundings.data.title as string}</h2>
          <hr className="rule mx-auto my-8" />
          <p className="font-display text-xl leading-relaxed text-ink/90">
            {surroundings.data.intro as string}
          </p>
        </div>

        <div className="mt-16">
          <Gallery photos={beachGallery} />
        </div>

        <div className="mx-auto mt-16 max-w-2xl prose-body">
          <div dangerouslySetInnerHTML={{ __html: surroundingsHtml }} />
        </div>
      </Section>
    </main>
  );
}
