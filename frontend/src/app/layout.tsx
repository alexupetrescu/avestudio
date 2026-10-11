import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { SITE_URL, DEFAULT_IMAGE } from "@/lib/seo";
import { generateOrganization } from "@/lib/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AVE Studio | Ei cresc. Fotografiile rămân.",
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
    title: 'AVE Studio | Ei cresc. Fotografiile rămân.',
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
    title: 'AVE Studio | Ei cresc. Fotografiile rămân.',
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
  verification: {},
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
      </head>
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col">
        <GoogleAnalytics />
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
