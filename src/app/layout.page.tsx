import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { AppProviders } from '@/app/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vedhaprem Mandi — Wholesale Onion Shop Management',
  description:
    'Curated Academic wholesale onion trading and mandi management platform. Live bag-weight calculations, multi-mark lot inventory, and credit ledgers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Vedhaprem Mandi" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1976d2" />
      </head>
      <body className="bg-surface text-on-surface font-body antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
