import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchPortfolio } from '@/lib/api';
import { generateMetadata as generateSEOMetadata, extractFirstImage, SITE_URL } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const portfolioData = await fetchPortfolio().catch(() => []);
  const firstImage = extractFirstImage(portfolioData);

  return generateSEOMetadata({
    title: 'Albume Publice - AVE Studio | Colecții de Fotografii',
    description: 'Răsfoiți albumele și colecțiile noastre publice de fotografii. Colecții speciale de nunti, botezuri, ședințe portret și evenimente corporative.',
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
        <div className="min-h-screen bg-white">
            {/* Header Section */}
            <section className="pt-32 pb-16 px-8 lg:px-16 border-b border-black/5">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-6xl md:text-7xl font-bold text-black mb-4 tracking-tight">
                        Albume
                    </h1>
                    <p className="text-lg text-black/60">
                        Răsfoiți albumele și colecțiile noastre publice de fotografii
                    </p>
                </div>
            </section>

            {/* Albums Grid */}
            <section className="py-16 px-8 lg:px-16">
                <div className="max-w-7xl mx-auto">
                    {publicAlbums.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {publicAlbums.map((album, index) => (
                                <Link
                                    key={album.id}
                                    href={`/albums/${album.id}`}
                                    className="group block relative overflow-hidden bg-gray-100 card-hover"
                                >
                                    <div className="relative aspect-[4/5] overflow-hidden">
                                        <img
                                            src={album.coverImage}
                                            alt={album.title}
                                            className="w-full h-full object-cover image-zoom"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500"></div>
                                    </div>
                                    <div className="p-8">
                                        <h3 className="text-2xl font-bold text-black mb-2">{album.title}</h3>
                                        <div className="flex items-center justify-between text-sm text-black/50">
                                            <span>{album.imageCount} Fotografii</span>
                                            <span>{album.date}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32">
                            <p className="text-black/60 text-lg mb-4">Nu sunt albume publice disponibile în acest moment.</p>
                            <p className="text-black/40 text-sm mb-8">
                                Consultați <Link href="/portfolio" className="text-black hover:underline">portofoliul</Link> nostru în schimb.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Info Section */}
            <section className="py-32 px-8 lg:px-16 bg-white border-t border-black/5">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
                        Căutați Albumul Dvs. Privat?
                    </h2>
                    <p className="text-lg text-black/60 mb-10 leading-relaxed">
                        Dacă aveți un PIN pentru un album privat de client, îl puteți accesa prin portalul nostru pentru clienți.
                    </p>
                    <Link
                        href="/client"
                        className="btn-primary inline-block"
                    >
                        Acces Client
                    </Link>
                </div>
            </section>
        </div>
    );
}
