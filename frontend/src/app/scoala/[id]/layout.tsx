import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lista de comenzi - pagina clasei',
  description: 'Pagină privată pentru cadrele didactice: lista copiilor și pachetele foto dorite.',
  robots: { index: false, follow: false },
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
