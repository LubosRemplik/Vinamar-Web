import WindowFinder from '@/components/WindowFinder';

export const metadata = { title: 'Najít nejlevnější termíny — Vinamar' };

export default function NajitTerminy() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">Najděte nejlevnější termíny</h1>
      <p className="text-ink/80 mb-6">Vyberte odkud poletíte a na jak dlouho (min. 7 nocí).</p>
      <WindowFinder />
    </main>
  );
}
