import type { Metadata } from 'next';
import Section from '@/components/Section';
import { readPage, renderMarkdown } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Pokyny k pobytu — ViñaMar',
  description: 'Check-in, check-out a praktické informace k pobytu v apartmánu ViñaMar.',
  // Guest-only page: reachable by direct link, hidden from search engines.
  robots: { index: false, follow: false },
};

export default async function Pokyny() {
  const { data, body } = readPage('pokyny.md');
  const html = await renderMarkdown(body);

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-4">Pro naše hosty</p>
          <h1>{data.title as string}</h1>
          <hr className="rule mx-auto my-8" />
          <p className="font-display text-xl leading-relaxed text-ink/90">
            {data.intro as string}
          </p>
          <p className="mt-10">
            <a href="/pokyny/pdf" className="btn btn-outline no-underline">
              Stáhnout PDF
            </a>
          </p>
        </div>

        <div className="prose-body mx-auto mt-16 max-w-2xl">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </Section>
    </main>
  );
}
