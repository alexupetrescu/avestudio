import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Album copil',
  description: 'Album privat cu fotografiile copilului, protejat cu PIN.',
  robots: { index: false, follow: false },
};

export default function ChildAlbumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
