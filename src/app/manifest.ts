import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vedhaprem Mandi — Wholesale Onion Shop Management',
    short_name: 'Vedhaprem Mandi',
    description:
      'Curated Academic wholesale onion trading and mandi management platform. Live bag-weight calculations, multi-mark lot inventory, and credit ledgers.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1976d2',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
