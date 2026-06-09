import InquiryForm from '@/components/InquiryForm';

export const metadata = { title: 'Rezervace — Vinamar' };

export default function Rezervace() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">Rezervace</h1>
      <p className="text-ink/80 mb-6">Minimální pobyt 7 nocí. Pošlete nám poptávku a my se ozveme.</p>
      <InquiryForm />
    </main>
  );
}
