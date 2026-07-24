import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Jost, Kaushan_Script } from 'next/font/google';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const script = Kaushan_Script({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-script',
  display: 'swap',
});

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-display',
  display: 'swap',
});

const body = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Apartmán na pobřeží Costa Blanca, La Mata, Torrevieja',
  description:
    'Apartmán s bazénem 300 m od pláže v La Mata u Torrevieja. Podívejte se, kdy je volno, a rezervujte termín.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="cs"
      className={`${script.variable} ${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
