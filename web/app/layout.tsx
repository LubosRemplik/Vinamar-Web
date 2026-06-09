import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Vinamar — apartmán u moře, La Mata',
  description: 'Apartmán k pronájmu v La Mata, Torrevieja. Podívejte se, kdy je volno a jak se levně dostat.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={inter.variable}>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
