import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: '360° Panoramă | AVE Studio',
  description: 'Vizualizare panoramică 360° - Explorați locația în realitate virtuală pe telefon sau Oculus VR.',
  openGraph: {
    title: '360° Panoramă | AVE Studio',
    description: 'Vizualizare panoramică 360° - Explorați locația în realitate virtuală.',
    url: `${SITE_URL}/360view`,
  },
};

export default function Panorama360Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
