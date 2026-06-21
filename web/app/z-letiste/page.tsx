import { readPage, renderMarkdown } from '@/lib/content';

const ROUTE_URL =
  'https://www.google.com/maps/dir/?api=1&origin=Alicante+Airport+ALC&destination=La+Mata,+Torrevieja';

export default async function ZLetiste() {
  const { data, body } = readPage('z-letiste.md');
  const html = await renderMarkdown(body);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">{data.title as string}</h1>
      <p className="text-ink/80">{data.intro as string}</p>
      <div className="prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      <a
        href={ROUTE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-6 rounded-lg bg-terracotta px-5 py-3 font-medium text-sand hover:bg-terracotta/90"
      >
        Trasa z letiště ALC do La Mata
      </a>
    </main>
  );
}
