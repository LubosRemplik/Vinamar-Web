import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Gallery from '@/components/Gallery';
import Section from '@/components/Section';
import { getTrip, getTripSlugs, renderMarkdown } from '@/lib/content';

export function generateStaticParams() {
  return getTripSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { meta } = getTrip(slug);
    return { title: `${meta.title} — ViñaMar`, description: meta.summary };
  } catch {
    return {};
  }
}

export default async function TripDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let trip;
  try {
    trip = getTrip(slug);
  } catch {
    notFound();
  }
  const html = await renderMarkdown(trip!.body);
  const { meta } = trip!;

  // The gallery (in the lightbox) includes the hero shot as its first photo.
  const galleryPhotos = [
    ...(meta.image ? [{ src: meta.image, alt: meta.title }] : []),
    ...(meta.gallery ?? []),
  ];

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          {meta.distanceKm != null && (
            <p className="eyebrow mb-4">
              {meta.distanceKm} km z La Maty
              {meta.driveMinutes != null && ` · ${meta.driveMinutes} min autem`}
            </p>
          )}
          <h1>{meta.title}</h1>
          <hr className="rule mx-auto my-8" />
          <p className="font-display text-xl leading-relaxed text-ink/90">{meta.summary}</p>
        </div>
      </Section>

      {meta.image && (
        // Full-bleed on a normal desktop, but capped so it doesn't turn huge on
        // very wide (2K/4K) monitors.
        <figure className="mx-auto w-full max-w-[1920px]">
          <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
            <Image
              src={meta.image}
              alt={meta.title}
              fill
              sizes="(min-width: 1920px) 1920px, 100vw"
              className="object-cover"
            />
          </div>
          {meta.imageCredit && (
            <figcaption className="mt-3 px-6 text-right text-[11px] text-sage">
              Foto:{' '}
              {meta.imageCreditUrl ? (
                <a
                  href={meta.imageCreditUrl}
                  className="underline decoration-line underline-offset-2"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {meta.imageCredit}
                </a>
              ) : (
                meta.imageCredit
              )}
            </figcaption>
          )}
        </figure>
      )}

      <Section top={Boolean(meta.image)}>
        <div className="mx-auto max-w-2xl">
          <div className="prose-body" dangerouslySetInnerHTML={{ __html: html }} />

          {meta.externalLink && (
            <p className="mt-8">
              <a
                href={meta.externalLink}
                className="btn btn-outline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Oficiální web
              </a>
            </p>
          )}
        </div>

        {galleryPhotos.length > 1 && (
          <div className="mx-auto mt-16 max-w-5xl">
            <Gallery photos={galleryPhotos} />
          </div>
        )}

        <div className="mt-16 text-center">
          <Link href="/tipy-na-vylety" className="eyebrow hover:text-ink">
            ← Všechny tipy
          </Link>
        </div>
      </Section>
    </main>
  );
}
