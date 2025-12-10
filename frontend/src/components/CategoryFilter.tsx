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
        <div className="flex flex-wrap gap-3">
            <Link
                href="/portfolio"
                className={`px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                    !currentCategory
                        ? 'bg-black text-white'
                        : 'bg-transparent text-black/60 hover:text-black border border-black/20 hover:border-black'
                }`}
            >
                Toate
            </Link>
            {categories.map((category) => (
                <Link
                    key={category.id}
                    href={`/portfolio?category=${category.slug}`}
                    className={`px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                        currentCategory === category.slug
                            ? 'bg-black text-white'
                            : 'bg-transparent text-black/60 hover:text-black border border-black/20 hover:border-black'
                    }`}
                >
                    {category.name}
                </Link>
            ))}
        </div>
    );
}
