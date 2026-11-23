import type { Metadata } from 'next';
import { CrmProvider } from '@/components/crm/CrmProvider';
import './crm.css';

export const metadata: Metadata = {
  title: 'CRM', description: 'Administrarea claselor și fotografiilor AVE Studio.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmProvider>{children}</CrmProvider>;
}
