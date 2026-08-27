import { renderPokynyPdf } from '@/lib/pokyny-pdf';

export async function GET() {
  const pdf = await renderPokynyPdf();
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="vinamar-pokyny-k-pobytu.pdf"',
    },
  });
}
