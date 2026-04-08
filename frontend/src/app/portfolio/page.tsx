import type { Metadata } from 'next';
import { fetchPortfolio, fetchCategories } from '@/lib/api';
import PortfolioMasonry from '@/components/PortfolioMasonry';
import ScrollReveal from '@/components/ScrollReveal';
import { generateMetadata as generateSEOMetadata, extractFirstImage, SITE_URL } from '@/lib/seo';

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

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
    const { category } = await searchParams;
    const [portfolioData, categoriesData] = await Promise.all([
        fetchPortfolio(category).catch(() => ({ results: [], next: null })),
        fetchCategories().catch(() => []),
    ]);

    const portfolio: PortfolioImage[] = portfolioData.results || portfolioData || [];
    const categories: Category[] = categoriesData || [];
    const firstImage = extractFirstImage(portfolio);

    const categoryName = category
        ? categories.find(c => c.slug === category)?.name || category
        : null;

    const title = categoryName
        ? `Portofoliu ${categoryName} - AVE Studio | Fotografie Profesională`
        : 'Portofoliu - AVE Studio | Fotografie Profesională';

    const description = categoryName
        ? `Explorează portofoliul nostru de fotografii ${categoryName.toLowerCase()}. Moment speciale capturate cu pasiune și profesionalism de AVE Studio.`
        : 'Explorează portofoliul nostru complet de fotografii. Moment speciale, evenimente și sesiuni foto profesionale capturate cu pasiune de AVE Studio.';

    return generateSEOMetadata({
        title,
        description,
        images: [{ url: firstImage, width: 1200, height: 630, alt: title }],
        url: `${SITE_URL}/portfolio${category ? `?category=${category}` : ''}`,
        type: 'website',
        section: categoryName || undefined,
    });
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

    const portfolio: PortfolioImage[] = portfolioData.results || portfolioData || [];
    const categories: Category[] = categoriesData || [];
    const hasNextPage = portfolioData.next !== null && portfolioData.next !== undefined;

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Hero */}
            <section className="pt-36 pb-12 px-6 lg:px-12">
                <ScrollReveal>
                    <div className="max-w-7xl mx-auto">
                        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">
                            Portofoliu
                        </p>
                        <h1
                            className="text-4xl md:text-5xl lg:text-6xl font-semibold text-black mb-6 tracking-tight"
                            style={{ fontFamily: 'var(--font-heading)' }}
                        >
                            Momente Care <em className="font-normal italic">Rămân</em>
                        </h1>
                        <div className="luxury-line mb-6" />
                        <p className="text-base md:text-lg text-black/40 max-w-xl leading-relaxed font-light">
                            Fiecare fotografie spune o poveste despre dragoste, creștere și timpul care trece prea repede
                        </p>
                    </div>
                </ScrollReveal>
            </section>

            {/* Filter */}
            {categories.length > 0 && (
                <section className="sticky top-20 z-40 bg-[var(--background)]/95 backdrop-blur-xl py-4 px-6 lg:px-12 transition-all duration-300">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-wrap gap-2 md:gap-3">
                            <a
                                href="/portfolio"
                                className={`px-5 py-2 text-[13px] font-medium transition-all duration-500 rounded-full ${
                                    !category
                                        ? 'bg-[var(--accent)] text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
                                        : 'bg-transparent text-black/40 hover:text-black border border-black/10 hover:border-black/30'
                                }`}
                            >
                                Toate
                            </a>
                            {categories.map((cat) => (
                                <a
                                    key={cat.id}
                                    href={`/portfolio?category=${cat.slug}`}
                                    className={`px-5 py-2 text-[13px] font-medium transition-all duration-500 rounded-full ${
                                        category === cat.slug
                                            ? 'bg-[var(--accent)] text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
                                            : 'bg-transparent text-black/40 hover:text-black border border-black/10 hover:border-black/30'
                                    }`}
                                >
                                    {cat.name}
                                </a>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Grid */}
            {portfolio.length > 0 ? (
                <PortfolioMasonry
                    initialItems={portfolio}
                    category={category}
                    categories={categories}
                    hasNextPage={hasNextPage}
                />
            ) : (
                <section className="py-32 px-6 lg:px-12">
                    <div className="max-w-7xl mx-auto text-center">
                        <p className="text-black/40 text-lg mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                            Nu s-au găsit imagini în această categorie.
                        </p>
                        <p className="text-black/25 text-sm">
                            Vă rugăm să verificați mai târziu sau să răsfoiți alte categorii.
                        </p>
                    </div>
                </section>
            )}
        </div>
    );
}
