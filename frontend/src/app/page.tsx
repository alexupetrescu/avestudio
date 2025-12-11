import Link from 'next/link';
import Image from 'next/image';
import { fetchPortfolio, fetchCategories } from '@/lib/api';
import PortfolioCarousel from '@/components/PortfolioCarousel';
import ScrollReveal from '@/components/ScrollReveal';
import HeroParallax from '@/components/HeroParallax';

export default async function Home() {
  const [portfolioData, categoriesData] = await Promise.all([
    fetchPortfolio().catch(() => ({ results: [], next: null })),
    fetchCategories().catch(() => []),
  ]);

  // Handle paginated response - extract results array
  const portfolioArray = portfolioData.results || portfolioData || [];
  const featuredPortfolio = Array.isArray(portfolioArray) ? portfolioArray.slice(0, 12) : [];
  const categories = categoriesData || [];

  return (
    <div className="flex flex-col bg-white">
      {/* Hero Section - Full Image with Bottom-Left Overlay */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Hero Image with subtle parallax effect */}
        <HeroParallax />

        {/* Subtle gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />

        {/* Bottom-Left Overlay with Gradient */}
        <div className="absolute bottom-0 left-0 w-full lg:w-auto p-8 lg:p-12 pb-12 lg:pb-16 z-10">
          <div className="relative bg-gradient-to-t from-black/80 via-black/50 to-black/30 backdrop-blur-glass p-8 lg:p-12 rounded-xl max-w-2xl border border-white/10 shadow-2xl">
            {/* Small Logo with animation */}
            <div className="mb-6 animate-slide-down" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <Image
                src="/logo/avephotostudio.svg"
                alt="AveStudio"
                width={150}
                height={40}
                className="h-6 w-auto brightness-0 invert transition-opacity duration-500"
                priority
              />
            </div>

            {/* Main Heading - White, Large, Emotional with animation */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 leading-[1.1] tracking-tight animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              Cresc atât de repede
            </h1>

            {/* Subheading - Shorter, Punchier with animation */}
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-8 font-normal leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
              Pentru momentele care nu se mai întorc
            </p>

            {/* Single White-Outlined CTA Button with enhanced animation */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
              <Link 
                href="/portfolio" 
                className="inline-block px-8 py-4 border-2 border-white text-white font-medium hover:bg-white hover:text-black transition-all duration-500 rounded-sm relative overflow-hidden group"
              >
                <span className="relative z-10 group-hover:text-black transition-colors duration-300">Vezi Portofoliul</span>
                <span className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left -z-0"></span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Carousel Section */}
      {featuredPortfolio.length > 0 && (
        <section className="bg-white">
          {/* Section Header with scroll reveal */}
          <ScrollReveal>
            <div className="max-w-7xl mx-auto px-8 lg:px-16 pt-32 pb-16">
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-black mb-4 tracking-tight">
                Ei Au Ales Să Oprească Timpul
              </h2>
              <p className="text-xl md:text-2xl text-black/60">
                Poate e rândul tău
              </p>
            </div>
          </ScrollReveal>

          {/* Carousel */}
          <PortfolioCarousel items={featuredPortfolio} />
        </section>
      )}

      {/* CTA Section with enhanced styling */}
      <section className="py-40 bg-black text-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        <ScrollReveal>
          <div className="max-w-4xl mx-auto px-8 lg:px-16 text-center relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight">
              Gata să Creăm
              <br />
              <span className="inline-block animate-float">Amintiri?</span>
            </h2>
            <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
              Să lucrăm împreună pentru a vă captura momentele speciale
            </p>
            <div className="space-y-6 text-white/90">
              <div className="group">
                <p className="font-semibold mb-2 text-lg">Adina</p>
                <a href="tel:0746986415" className="block hover:text-white transition-all duration-300 hover:translate-x-1 inline-block">
                  0746986415
                </a>
                <a href="mailto:adina@aveletter.ro" className="block hover:text-white transition-all duration-300 hover:translate-x-1 inline-block">
                  adina@aveletter.ro
                </a>
              </div>
              <div className="group">
                <p className="font-semibold mb-2 text-lg">Alex</p>
                <a href="tel:0756538455" className="block hover:text-white transition-all duration-300 hover:translate-x-1 inline-block">
                  0756538455
                </a>
                <a href="mailto:alexupetrescu@pm.me" className="block hover:text-white transition-all duration-300 hover:translate-x-1 inline-block">
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
