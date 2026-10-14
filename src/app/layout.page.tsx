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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vedhaprem Mandi',
  },
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="bg-surface text-on-surface font-body antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
