import Gallery from '@/components/Gallery';
import { readPage, renderMarkdown } from '@/lib/content';

export default async function Okoli() {
  const { data, body } = readPage('okoli.md');
  const html = await renderMarkdown(body);
  const gallery = (data.gallery as string[]) ?? [];

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">{data.title as string}</h1>
      <p className="text-ink/80">{data.intro as string}</p>
      <Gallery images={gallery} />
      <div className="prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
