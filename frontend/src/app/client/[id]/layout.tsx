import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata, extractFirstImage, SITE_URL } from '@/lib/seo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function getAlbumData(id: string) {
  try {
    const res = await fetch(`${API_URL}/albums/${id}/`, { 
      cache: 'no-store',
      next: { revalidate: 60 } // Revalidate every minute
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const album = await getAlbumData(id);

  if (!album) {
    return generateSEOMetadata({
      title: 'Album Client - AVE Studio',
      description: 'Accesează albumul tău de fotografii de la AVE Studio.',
      url: `${SITE_URL}/client/${id}`,
    });
  }

  const firstImage = extractFirstImage(album.images);
  const imageCount = album.images?.length || 0;

  return generateSEOMetadata({
    title: `${album.title} - Album Client | AVE Studio`,
    description: `Album personal cu ${imageCount} ${imageCount === 1 ? 'fotografie' : 'fotografii'} de la AVE Studio. ${album.title}`,
    images: [{ url: firstImage, width: 1200, height: 630, alt: album.title }],
    url: `${SITE_URL}/client/${id}`,
    type: 'website',
  });
}

export default function ClientAlbumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

