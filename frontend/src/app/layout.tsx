import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE_URL, DEFAULT_IMAGE } from "@/lib/seo";
import { generateOrganization } from "@/lib/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AVE Studio - Fotografie Profesională",
    template: "%s | AVE Studio",
  },
  description: "Fotografie profesională pentru evenimente speciale. Capturăm momentele care nu se mai întorc - nunti, botezuri, evenimente corporative. Oferim servicii complete de fotografie în România.",
  keywords: ["fotografie profesională", "fotograf nuntă", "fotograf botez", "fotograf evenimente", "AVE Studio", "fotografie România", "fotograf București"],
  authors: [{ name: "AVE Studio" }],
  creator: "AVE Studio",
  publisher: "AVE Studio",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/logo/favicons/aveico.svg', type: 'image/svg+xml' },
      { url: '/logo/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo/favicons/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/logo/favicons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/logo/favicons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo/favicons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: SITE_URL,
    siteName: 'AVE Studio',
    title: 'AVE Studio - Fotografie Profesională',
    description: 'Fotografie profesională pentru evenimente speciale. Capturăm momentele care nu se mai întorc.',
    images: [
      {
        url: DEFAULT_IMAGE,
        width: 1200,
        height: 630,
        alt: 'AVE Studio - Fotografie Profesională',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AVE Studio - Fotografie Profesională',
    description: 'Fotografie profesională pentru evenimente speciale. Capturăm momentele care nu se mai întorc.',
    images: [DEFAULT_IMAGE],
    creator: '@avestudio',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organization = generateOrganization({
    name: 'AVE Studio',
    url: SITE_URL,
    logo: `${SITE_URL}/logo/avephotostudio.svg`,
    contactPoint: [
      {
        telephone: '+40746986415',
        contactType: 'customer service',
        email: 'adina@aveletter.ro',
      },
      {
        telephone: '+40756538455',
        contactType: 'customer service',
        email: 'alexupetrescu@pm.me',
      },
    ],
    sameAs: [
      'https://www.instagram.com/avephoto.studio/',
      'https://www.facebook.com/profile.php?id=61578330532230',
    ],
  });

  return (
    <html lang="ro">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
      </head>
      <body className="antialiased bg-white text-black min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
