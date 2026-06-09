import './globals.css';
import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Vinamar — apartmán u moře, La Mata',
  description: 'Apartmán k pronájmu v La Mata, Torrevieja. Pláž, slunce, levné letenky.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
