import type { Metadata } from 'next';
import Section from '@/components/Section';
import { readPage, renderMarkdown } from '@/lib/content';

const ROUTE_URL =
  'https://www.google.com/maps/dir/?api=1&origin=Alicante+Airport+ALC&destination=La+Mata,+Torrevieja';

export const metadata: Metadata = {
  title: 'Z letiště — ViñaMar',
  description: 'Jak se dostat z letiště Alicante do La Maty — autem, autobusem nebo taxíkem.',
};

export default async function ZLetiste() {
  const { data, body } = readPage('z-letiste.md');
  const html = await renderMarkdown(body);

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-4">Alicante · ALC</p>
          <h1>{data.title as string}</h1>
          <hr className="rule mx-auto my-8" />
          <p className="font-display text-xl leading-relaxed text-ink/90">
            {data.intro as string}
          </p>
        </div>

        <div className="prose-body mx-auto mt-16 max-w-2xl">
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <p className="mt-10 text-center">
            <a
              href={ROUTE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline no-underline"
            >
              Trasa z letiště na mapě
            </a>
          </p>
        </div>
      </Section>
    </main>
  );
}
