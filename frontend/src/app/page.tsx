import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { fetchPortfolio, fetchCategories } from '@/lib/api';
import PortfolioCarousel from '@/components/PortfolioCarousel';
import ScrollReveal from '@/components/ScrollReveal';
import HeroParallax from '@/components/HeroParallax';
import { generateMetadata as generateSEOMetadata, extractFirstImage, SITE_URL } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const portfolioData = await fetchPortfolio().catch(() => ({ results: [], next: null }));
  const portfolioArray = portfolioData.results || portfolioData || [];
  const firstImage = extractFirstImage(portfolioArray);

  return generateSEOMetadata({
    title: 'AVE Studio - Fotografie Profesională | Capturând Momente, Creând Amintiri',
    description: 'Fotografie profesională pentru evenimente speciale. Capturăm momentele care nu se mai întorc - nunti, botezuri, evenimente corporative. Oferim servicii complete de fotografie în România.',
    images: [{ url: firstImage, width: 1200, height: 630, alt: 'AVE Studio - Fotografie Profesională' }],
    url: SITE_URL,
    type: 'website',
  });
}

export default async function Home() {
  const [portfolioData, categoriesData] = await Promise.all([
    fetchPortfolio().catch(() => ({ results: [], next: null })),
    fetchCategories().catch(() => []),
  ]);

  const portfolioArray = portfolioData.results || portfolioData || [];
  const featuredPortfolio = Array.isArray(portfolioArray) ? portfolioArray.slice(0, 12) : [];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-screen w-full overflow-hidden">
        <HeroParallax />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Hero content */}
        <div className="absolute inset-0 flex items-end z-10">
          <div className="w-full px-6 lg:px-12 pb-16 lg:pb-24 max-w-7xl mx-auto">
            <div className="max-w-2xl">
              {/* Logo mark */}
              <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                <Image
                  src="/logo/avephotostudio.svg"
                  alt="AVE Studio"
                  width={120}
                  height={32}
                  className="h-5 w-auto brightness-0 invert opacity-60"
                  priority
                />
              </div>

              {/* Heading */}
              <h1
                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold text-white mb-6 leading-[1.05] tracking-tight animate-fade-in-up"
                style={{ animationDelay: '0.5s', animationFillMode: 'both', fontFamily: 'var(--font-heading)' }}
              >
                Cresc atât
                <br />
                <em className="font-normal italic">de repede</em>
              </h1>

              {/* Decorative line */}
              <div
                className="luxury-line-white mb-6 animate-fade-in"
                style={{ animationDelay: '0.7s', animationFillMode: 'both' }}
              />

              {/* Subheading */}
              <p
                className="text-lg md:text-xl text-white/70 mb-10 font-light leading-relaxed animate-fade-in-up"
                style={{ animationDelay: '0.8s', animationFillMode: 'both' }}
              >
                Pentru momentele care nu se mai întorc
              </p>

              {/* CTA */}
              <div className="animate-fade-in-up" style={{ animationDelay: '1s', animationFillMode: 'both' }}>
                <Link
                  href="/portfolio"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-white/30 text-white text-sm font-medium tracking-[0.05em] hover:bg-white hover:text-black transition-all duration-700 backdrop-blur-sm bg-white/5"
                >
                  <span>Vezi Portofoliul</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-float">
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent to-white/40" />
        </div>
      </section>

      {/* Portfolio Section */}
      {featuredPortfolio.length > 0 && (
        <section className="bg-[var(--background)]">
          <ScrollReveal>
            <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-32 pb-16">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">
                    Portofoliu
                  </p>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-black tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                    Ei Au Ales Să
                    <br />
                    <em className="font-normal italic">Oprească Timpul</em>
                  </h2>
                </div>
                <p className="text-base text-black/40 max-w-sm leading-relaxed">
                  Poate e rândul tău să transformi o clipă într-o amintire veșnică
                </p>
              </div>
            </div>
          </ScrollReveal>

          <PortfolioCarousel items={featuredPortfolio} />
        </section>
      )}

      {/* CTA Section */}
      <section className="py-32 md:py-40 bg-[#0a0a0a] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)',
            backgroundSize: '48px 48px'
          }} />
        </div>

        <ScrollReveal>
          <div className="max-w-3xl mx-auto px-6 lg:px-12 text-center relative z-10">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/30 mb-6">
              Contact
            </p>
            <h2
              className="text-4xl md:text-6xl lg:text-7xl font-semibold mb-6 leading-tight tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Gata să Creăm
              <br />
              <em className="font-normal italic animate-float inline-block">Amintiri?</em>
            </h2>

            <div className="luxury-line-white mx-auto mb-8" />

            <p className="text-lg text-white/40 mb-16 max-w-lg mx-auto leading-relaxed font-light">
              Să lucrăm împreună pentru a vă captura momentele speciale
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-md mx-auto text-white/60">
              <div className="group">
                <p className="text-white font-medium mb-2 text-sm tracking-wide">Adina</p>
                <a href="tel:0746986415" className="block text-sm hover:text-white transition-colors duration-500 mb-0.5">
                  0746 986 415
                </a>
                <a href="mailto:adina@aveletter.ro" className="block text-sm hover:text-white transition-colors duration-500">
                  adina@aveletter.ro
                </a>
              </div>
              <div className="group">
                <p className="text-white font-medium mb-2 text-sm tracking-wide">Alex</p>
                <a href="tel:0756538455" className="block text-sm hover:text-white transition-colors duration-500 mb-0.5">
                  0756 538 455
                </a>
                <a href="mailto:alexupetrescu@pm.me" className="block text-sm hover:text-white transition-colors duration-500">
                  alexupetrescu@pm.me
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
