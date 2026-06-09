import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTrip, getTripSlugs, renderMarkdown } from '@/lib/content';

export function generateStaticParams() {
  return getTripSlugs().map((slug) => ({ slug }));
}

export default async function TripDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let trip;
  try {
    trip = getTrip(slug);
  } catch {
    notFound();
  }
  const html = await renderMarkdown(trip!.body);
  const { meta } = trip!;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">{meta.title}</h1>
      <p className="text-ink/70 mb-4">{meta.summary}</p>
      <div className="relative h-64 rounded-xl overflow-hidden mb-6">
        <Image src={meta.image} alt={meta.title} fill className="object-cover" />
      </div>
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
