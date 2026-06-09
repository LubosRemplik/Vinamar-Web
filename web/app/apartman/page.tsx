import Gallery from '@/components/Gallery';
import { readPage, renderMarkdown } from '@/lib/content';

export default async function Apartman() {
  const { data, body } = readPage('apartman.md');
  const html = await renderMarkdown(body);
  const amenities = (data.amenities as string[]) ?? [];
  const gallery = (data.gallery as string[]) ?? [];

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">{data.title as string}</h1>
      <p className="text-ink/80">{data.intro as string}</p>
      <Gallery images={gallery} />
      <div className="prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      <h2 className="text-2xl mt-8 mb-3">Vybavení</h2>
      <ul className="list-disc pl-6 space-y-1">
        {amenities.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </main>
  );
}
