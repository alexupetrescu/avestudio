import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchPortfolio } from '@/lib/api';
import { generateMetadata as generateSEOMetadata, extractFirstImage, SITE_URL } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const portfolioData = await fetchPortfolio().catch(() => []);
  const firstImage = extractFirstImage(portfolioData);

  return generateSEOMetadata({
    title: 'Albume Publice - AVE Studio | Colecții de Fotografii',
    description: 'Răsfoiți albumele și colecțiile noastre publice de fotografii. Colecții speciale de nunți, botezuri, ședințe portret și evenimente corporative.',
    images: [{ url: firstImage, width: 1200, height: 630, alt: 'Albume AVE Studio' }],
    url: `${SITE_URL}/albums`,
    type: 'website',
  });
}

export default async function AlbumsPage() {
    const portfolioData = await fetchPortfolio().catch(() => []);
    const featuredItems = portfolioData.slice(0, 12) || [];

    const publicAlbums = [
        {
            id: '1',
            title: 'Colecție Nuntă 2024',
            coverImage: portfolioData[0]?.image || '',
            imageCount: 45,
            date: '2024',
        },
        {
            id: '2',
            title: 'Ședințe Portret',
            coverImage: portfolioData[1]?.image || '',
            imageCount: 32,
            date: '2024',
        },
        {
            id: '3',
            title: 'Fotografie Evenimente',
            coverImage: portfolioData[2]?.image || '',
            imageCount: 28,
            date: '2024',
        },
    ].filter(album => album.coverImage);

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <section className="pt-36 pb-12 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">Colecții</p>
                    <h1 className="text-4xl md:text-5xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                        Albume
                    </h1>
                    <div className="luxury-line mb-6" />
                    <p className="text-base text-black/40 font-light">
                        Răsfoiți albumele și colecțiile noastre publice de fotografii
                    </p>
                </div>
            </section>

            <section className="py-12 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    {publicAlbums.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {publicAlbums.map((album) => (
                                <Link
                                    key={album.id}
                                    href={`/albums/${album.id}`}
                                    className="group block relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--muted)] photo-card"
                                >
                                    <div className="relative aspect-[4/5] overflow-hidden">
                                        <img
                                            src={album.coverImage}
                                            alt={album.title}
                                            className="w-full h-full object-cover transition-transform duration-1000 ease-[var(--ease-luxury)] group-hover:scale-[1.06]"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-black mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
                                            {album.title}
                                        </h3>
                                        <div className="flex items-center justify-between text-xs text-black/30">
                                            <span>{album.imageCount} Fotografii</span>
                                            <span>{album.date}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32">
                            <p className="text-black/40 text-base mb-4">Nu sunt albume publice disponibile.</p>
                            <Link href="/portfolio" className="text-sm text-black/60 hover:text-black underline underline-offset-2 transition-colors">
                                Vezi portofoliul
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            <section className="py-28 px-6 lg:px-12">
                <div className="luxury-separator mb-20" />
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                        Căutați Albumul <em className="font-normal italic">Dvs. Privat?</em>
                    </h2>
                    <p className="text-base text-black/40 mb-10 leading-relaxed font-light">
                        Dacă aveți un PIN pentru un album privat, îl puteți accesa prin portalul pentru clienți.
                    </p>
                    <Link
                        href="/client"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500"
                    >
                        Acces Client
                    </Link>
                </div>
            </section>
        </div>
    );
}
