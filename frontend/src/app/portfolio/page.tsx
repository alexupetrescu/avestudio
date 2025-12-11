import { fetchPortfolio, fetchCategories } from '@/lib/api';
import PortfolioMasonry from '@/components/PortfolioMasonry';
import ScrollReveal from '@/components/ScrollReveal';

interface Category {
    id: number;
    name: string;
    slug: string;
}

interface PortfolioImage {
    id: number;
    title: string;
    image: string;
    description?: string | null;
    category: Category;
}

export default async function PortfolioPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const { category } = await searchParams;

    const [portfolioData, categoriesData] = await Promise.all([
        fetchPortfolio(category).catch(() => ({ results: [], next: null })),
        fetchCategories().catch(() => []),
    ]);

    // Handle paginated response
    const portfolio: PortfolioImage[] = portfolioData.results || portfolioData || [];
    const categories: Category[] = categoriesData || [];
    const hasNextPage = portfolioData.next !== null && portfolioData.next !== undefined;

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section - Minimal */}
            <section className="pt-32 pb-12 px-8 lg:px-16">
                <ScrollReveal>
                    <div className="max-w-7xl mx-auto text-center">
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-black mb-4 tracking-tight">
                            Momente Care Rămân
                        </h1>
                        <p className="text-lg md:text-xl text-black/60 max-w-3xl mx-auto leading-relaxed">
                            Fiecare fotografie spune o poveste despre dragoste, creștere și timpul care trece prea repede
                        </p>
                    </div>
                </ScrollReveal>
            </section>

            {/* Filter Tabs - Subtle, Top */}
            {categories.length > 0 && (
                <section className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm border-b border-black/5 py-4 px-8 lg:px-16">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                            <a
                                href="/portfolio"
                                className={`px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-full ${
                                    !category
                                        ? 'bg-black text-white'
                                        : 'bg-transparent text-black/60 hover:text-black border border-black/20 hover:border-black'
                                }`}
                            >
                                Toate
                            </a>
                            {categories.map((cat) => (
                                <a
                                    key={cat.id}
                                    href={`/portfolio?category=${cat.slug}`}
                                    className={`px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-full ${
                                        category === cat.slug
                                            ? 'bg-black text-white'
                                            : 'bg-transparent text-black/60 hover:text-black border border-black/20 hover:border-black'
                                    }`}
                                >
                                    {cat.name}
                                </a>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Masonry Grid Portfolio */}
            {portfolio.length > 0 ? (
                <PortfolioMasonry 
                    initialItems={portfolio} 
                    category={category}
                    categories={categories}
                    hasNextPage={hasNextPage}
                />
            ) : (
                <section className="py-32 px-8 lg:px-16">
                    <div className="max-w-7xl mx-auto text-center">
                        <p className="text-black/60 text-lg mb-2">Nu s-au găsit imagini în această categorie.</p>
                        <p className="text-black/40 text-sm">
                            Vă rugăm să verificați mai târziu sau să răsfoiți alte categorii.
                        </p>
                    </div>
                </section>
            )}
        </div>
    );
}
