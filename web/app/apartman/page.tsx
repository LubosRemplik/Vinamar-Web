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
    'Apartmán pro dva až čtyři s bazénem v rezidenci, tři sta metrů od písečné pláže La Mata u Torrevieja.',
};

const POOL = [
  { src: '/images/pool/pool-day.jpg', alt: 'Bazén rezidence za dne' },
  { src: '/images/pool/residence.jpg', alt: 'Rezidence s bazénem' },
  { src: '/images/pool/pool-day-02.jpg', alt: 'Bazén rezidence za slunečného dne' },
];

export default async function Apartman() {
  const apartment = readPage('apartman.md');
  const surroundings = readPage('okoli.md');
  const apartmentHtml = await renderMarkdown(apartment.body);
  const surroundingsHtml = await renderMarkdown(surroundings.body);

  const gallery = (apartment.data.gallery as Photo[]) ?? [];
  const amenities = (apartment.data.amenities as Amenity[]) ?? [];
  const equipment = (apartment.data.equipment as { title: string; items: string[] }[]) ?? [];
  const rental = (apartment.data.rental as string[]) ?? [];
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

      <Section className="border-t border-line">
        <SectionHeading eyebrow="Vybavení" title="Co v apartmánu najdete" />
        <div className="mx-auto mt-14 grid max-w-4xl gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {equipment.map((group) => (
            <div key={group.title}>
              <h3 className="text-lg">{group.title}</h3>
              <hr className="rule mt-3" />
              <ul className="mt-5 space-y-2 text-ink/90">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}

          {rental.length > 0 && (
            <div>
              <h3 className="text-lg">K zapůjčení</h3>
              <hr className="rule mt-3" />
              <ul className="mt-5 space-y-2 text-ink/90">
                {rental.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      <PhotoStrip photos={POOL} />

      <Section>
        <SectionHeading eyebrow="Rezidence" title="Bazén za domem" />
        <p className="mx-auto mt-8 max-w-2xl text-center leading-relaxed text-ink">
          K rezidenci patří společný bazén. V provozu je jen během sezóny, kdy u něj
          dohlíží plavčík; mimo sezónu je uzavřený.
        </p>
        <p className="mx-auto mt-6 max-w-2xl text-center">
          <span className="eyebrow">Otevírací doba v sezóně</span>
          <span className="mt-2 block font-display text-xl text-ink">
            11–15 h &middot; 17–21 h
          </span>
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
