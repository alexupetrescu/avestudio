import Link from 'next/link';
import Image from 'next/image';
import { fetchPortfolio, fetchCategories } from '@/lib/api';
import PortfolioCarousel from '@/components/PortfolioCarousel';

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
        {/* Hero Image - 90% coverage */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src="/avestudio-heroimage.jpg"
            alt="Hero"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Bottom-Left Overlay with Gradient */}
        <div className="absolute bottom-0 left-0 w-full lg:w-auto p-8 lg:p-12 pb-12 lg:pb-16">
          <div className="relative bg-gradient-to-t from-black/70 via-black/40 to-transparent p-8 lg:p-12 rounded-lg max-w-2xl">
            {/* Small Logo */}
            <div className="mb-6">
              <Image
                src="/logo/avephotostudio.svg"
                alt="AveStudio"
                width={150}
                height={40}
                className="h-6 w-auto brightness-0 invert"
                priority
              />
            </div>

            {/* Main Heading - White, Large, Emotional */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 leading-[1.1] tracking-tight">
              Cresc atât de repede
            </h1>

            {/* Subheading - Shorter, Punchier */}
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-8 font-normal leading-relaxed">
              Pentru momentele care nu se mai întorc
            </p>

            {/* Single White-Outlined CTA Button */}
            <Link 
              href="/portfolio" 
              className="inline-block px-8 py-4 border-2 border-white text-white font-medium hover:bg-white hover:text-black transition-all duration-300"
            >
              Vezi Portofoliul
            </Link>
          </div>
        </div>
      </section>

      {/* Portfolio Carousel Section */}
      {featuredPortfolio.length > 0 && (
        <section className="bg-white">
          {/* Section Header */}
          <div className="max-w-7xl mx-auto px-8 lg:px-16 pt-32 pb-16">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-black mb-4 tracking-tight">
              Ei Au Ales Să Oprească Timpul
            </h2>
            <p className="text-xl md:text-2xl text-black/60">
              Poate e rândul tău
            </p>
          </div>

          {/* Carousel */}
          <PortfolioCarousel items={featuredPortfolio} />
        </section>
      )}

      {/* CTA Section */}
      <section className="py-40 bg-black text-white">
        <div className="max-w-4xl mx-auto px-8 lg:px-16 text-center">
          <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight">
            Gata să Creăm
            <br />
            Amintiri?
          </h2>
          <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
            Să lucrăm împreună pentru a vă captura momentele speciale
          </p>
          <div className="space-y-4 text-white/90">
            <div>
              <p className="font-semibold mb-1">Adina</p>
              <a href="tel:0746986415" className="hover:text-white transition-colors duration-300">0746986415</a>
              <br />
              <a href="mailto:adina@aveletter.ro" className="hover:text-white transition-colors duration-300">adina@aveletter.ro</a>
            </div>
            <div>
              <p className="font-semibold mb-1">Alex</p>
              <a href="tel:0756538455" className="hover:text-white transition-colors duration-300">0756538455</a>
              <br />
              <a href="mailto:alexupetrescu@pm.me" className="hover:text-white transition-colors duration-300">alexupetrescu@pm.me</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
