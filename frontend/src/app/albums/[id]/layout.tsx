import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata, extractFirstImage, SITE_URL } from '@/lib/seo';
import { fetchPortfolio } from '@/lib/api';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const portfolioData = await fetchPortfolio().catch(() => []);
  const firstImage = extractFirstImage(portfolioData);

  return generateSEOMetadata({
    title: `Album ${id} - AVE Studio | Colecție de Fotografii`,
    description: `Vizualizați albumul ${id} de la AVE Studio. Colecție specială de fotografii profesionale.`,
    images: [{ url: firstImage, width: 1200, height: 630, alt: `Album ${id}` }],
    url: `${SITE_URL}/albums/${id}`,
    type: 'website',
  });
}

export default function AlbumDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

