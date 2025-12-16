/**
 * SEO utility functions for generating metadata and extracting images
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://avestudio.ro';
export const SITE_NAME = 'AVE Studio';
export const DEFAULT_DESCRIPTION = 'Fotografie profesională - Capturând momente, creând amintiri.';
export const DEFAULT_IMAGE = `${SITE_URL}/logo/avephotostudio.svg`;

export interface SEOImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface SEOMetadata {
  title: string;
  description: string;
  images?: SEOImage[];
  url?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

/**
 * Extract the first image from a content array or string
 */
export function extractFirstImage(
  images?: Array<{ image?: string; url?: string } | string> | null,
  fallback?: string
): string {
  if (!images || images.length === 0) {
    return fallback || DEFAULT_IMAGE;
  }

  const firstItem = images[0];
  
  if (typeof firstItem === 'string') {
    return firstItem.startsWith('http') ? firstItem : `${SITE_URL}${firstItem}`;
  }

  if (firstItem && typeof firstItem === 'object') {
    const imageUrl = firstItem.image || firstItem.url;
    if (imageUrl) {
      return imageUrl.startsWith('http') ? imageUrl : `${SITE_URL}${imageUrl}`;
    }
  }

  return fallback || DEFAULT_IMAGE;
}

/**
 * Generate full URL from a path
 */
export function getAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) {
    return path;
  }
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Generate Open Graph metadata
 */
export function generateOpenGraph(metadata: SEOMetadata) {
  const ogImage = metadata.images?.[0] || { url: DEFAULT_IMAGE };
  const ogUrl = metadata.url || SITE_URL;

  return {
    title: metadata.title,
    description: metadata.description,
    url: ogUrl,
    siteName: SITE_NAME,
    images: [
      {
        url: ogImage.url,
        width: ogImage.width || 1200,
        height: ogImage.height || 630,
        alt: ogImage.alt || metadata.title,
      },
    ],
    locale: 'ro_RO',
    type: metadata.type || 'website',
    ...(metadata.publishedTime && { publishedTime: metadata.publishedTime }),
    ...(metadata.modifiedTime && { modifiedTime: metadata.modifiedTime }),
    ...(metadata.author && { authors: [metadata.author] }),
    ...(metadata.section && { section: metadata.section }),
    ...(metadata.tags && { tags: metadata.tags }),
  };
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterCard(metadata: SEOMetadata) {
  const image = metadata.images?.[0] || { url: DEFAULT_IMAGE };

  return {
    card: 'summary_large_image',
    title: metadata.title,
    description: metadata.description,
    images: [image.url],
    creator: '@avestudio',
    site: '@avestudio',
  };
}

/**
 * Generate complete metadata object for Next.js
 */
export function generateMetadata(metadata: SEOMetadata) {
  const og = generateOpenGraph(metadata);
  const twitter = generateTwitterCard(metadata);

  return {
    title: metadata.title,
    description: metadata.description,
    openGraph: og,
    twitter: twitter,
    alternates: {
      canonical: metadata.url || SITE_URL,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
      },
    },
  };
}

