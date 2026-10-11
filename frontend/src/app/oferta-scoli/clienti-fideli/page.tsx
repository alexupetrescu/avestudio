import type { Metadata } from 'next';
import SchoolOffer from '@/components/SchoolOffer';
import { generateMetadata as generateSEOMetadata, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Ofertă foto Crăciun 2026 pentru clienți fideli - AVE Studio',
  description:
    'Prețuri speciale pentru școlile și grădinițele care au lucrat cu noi: Pachet Standard 45 lei (în loc de 65) sau Pachet Extra 65 lei (în loc de 85), cu format digital inclus.',
  url: `${SITE_URL}/oferta-scoli/clienti-fideli`,
  type: 'website',
  images: [{ url: `${SITE_URL}/oferta/calendar.webp`, width: 933, height: 1400, alt: 'Calendar de Crăciun 2027' }],
});

export default function OfertaClientiFideliPage() {
  return <SchoolOffer variant="returning" />;
}
