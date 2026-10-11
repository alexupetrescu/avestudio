import type { Metadata } from 'next';
import SchoolOffer from '@/components/SchoolOffer';
import { generateMetadata as generateSEOMetadata, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Ofertă foto Crăciun 2026 pentru școli și grădinițe - AVE Studio',
  description:
    'Pachet foto de Crăciun pentru școli și grădinițe: calendar 20x30 cu design, 2 felicitări, fotografie 20x30, 15x20 și retro 10x12, plus format digital. 75 lei în loc de 85 lei.',
  url: `${SITE_URL}/oferta-scoli`,
  type: 'website',
  images: [{ url: `${SITE_URL}/oferta/calendar.webp`, width: 933, height: 1400, alt: 'Calendar de Crăciun 2027' }],
});

export default function OfertaScoliPage() {
  return <SchoolOffer variant="new" />;
}
