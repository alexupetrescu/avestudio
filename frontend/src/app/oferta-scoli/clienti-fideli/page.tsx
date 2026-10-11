import type { Metadata } from 'next';
import SchoolOffer from '@/components/SchoolOffer';
import { generateMetadata as generateSEOMetadata, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Ofertă foto Crăciun 2026 pentru clienți fideli - AVE Studio',
  description:
    'Preț redus pentru școlile și grădinițele care au lucrat cu noi: pachetul de Crăciun la 70 lei în loc de 85 lei. Calendar, felicitări, fotografii și format digital.',
  url: `${SITE_URL}/oferta-scoli/clienti-fideli`,
  type: 'website',
  images: [{ url: `${SITE_URL}/oferta/calendar.webp`, width: 933, height: 1400, alt: 'Calendar de Crăciun 2027' }],
});

export default function OfertaClientiFideliPage() {
  return <SchoolOffer variant="returning" />;
}
