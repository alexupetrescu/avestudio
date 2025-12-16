import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function getPortfolioItems() {
  try {
    const res = await fetch(`${API_URL}/portfolio/`, { 
      next: { revalidate: 3600 } // Revalidate every hour
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || data || [];
  } catch {
    return [];
  }
}

async function getCategories() {
  try {
    const res = await fetch(`${API_URL}/categories/`, { 
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const portfolioItems = await getPortfolioItems();
  const categories = await getCategories();

  // Base pages
  const routes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/portfolio`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Category pages
  categories.forEach((category: { slug: string }) => {
    routes.push({
      url: `${SITE_URL}/portfolio?category=${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  // Portfolio items (if you want individual pages for each image)
  // Uncomment if you create individual portfolio item pages
  // portfolioItems.forEach((item: { id: number; updated_at?: string }) => {
  //   routes.push({
  //     url: `${SITE_URL}/portfolio/${item.id}`,
  //     lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
  //     changeFrequency: 'monthly',
  //     priority: 0.7,
  //   });
  // });

  return routes;
}

