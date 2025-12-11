import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "AveStudio - Fotografie Profesională",
  description: "Capturând momente, creând amintiri.",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
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
