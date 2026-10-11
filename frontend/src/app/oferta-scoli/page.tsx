import type { Metadata } from 'next';
import SchoolOffer from '@/components/SchoolOffer';
import { generateMetadata as generateSEOMetadata, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Ofertă foto Crăciun 2026 pentru școli și grădinițe - AVE Studio',
  description:
    'Ofertă foto de Crăciun pentru școli și grădinițe: Pachet Standard 50 lei (în loc de 65) sau Pachet Extra 75 lei (în loc de 85), cu calendar 20x30, fotografii, felicitări și format digital inclus.',
  url: `${SITE_URL}/oferta-scoli`,
  type: 'website',
  images: [{ url: `${SITE_URL}/oferta/calendar.webp`, width: 933, height: 1400, alt: 'Calendar de Crăciun 2027' }],
});

export default function OfertaScoliPage() {
  return <SchoolOffer variant="new" />;
}
