'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Category {
    id: number;
    name: string;
    slug: string;
}

export default function CategoryFilter({ categories }: { categories: Category[] }) {
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category');

    return (
        <div className="flex flex-wrap gap-2 md:gap-3">
            <Link
                href="/portfolio"
                className={`px-5 py-2 text-[13px] font-medium transition-all duration-500 rounded-full ${
                    !currentCategory
                        ? 'bg-[var(--accent)] text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
                        : 'bg-transparent text-black/40 hover:text-black border border-black/10 hover:border-black/30'
                }`}
            >
                Toate
            </Link>
            {categories.map((category) => (
                <Link
                    key={category.id}
                    href={`/portfolio?category=${category.slug}`}
                    className={`px-5 py-2 text-[13px] font-medium transition-all duration-500 rounded-full ${
                        currentCategory === category.slug
                            ? 'bg-[var(--accent)] text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
                            : 'bg-transparent text-black/40 hover:text-black border border-black/10 hover:border-black/30'
                    }`}
                >
                    {category.name}
                </Link>
            ))}
        </div>
    );
}
