/**
 * Structured Data (JSON-LD) utilities for SEO
 */

export interface Organization {
  name: string;
  url: string;
  logo?: string;
  contactPoint?: {
    telephone?: string;
    contactType?: string;
    email?: string;
  }[];
  sameAs?: string[];
}

export interface ImageObject {
  '@type': 'ImageObject';
  url: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface WebSite {
  '@type': 'WebSite';
  name: string;
  url: string;
  description?: string;
  publisher?: Organization;
}

export interface BreadcrumbList {
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

/**
 * Generate Organization structured data
 */
export function generateOrganization(org: Organization) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.url,
    ...(org.logo && {
      logo: {
        '@type': 'ImageObject',
        url: org.logo,
      },
    }),
    ...(org.contactPoint && {
      contactPoint: org.contactPoint.map(cp => ({
        '@type': 'ContactPoint',
        ...cp,
      })),
    }),
    ...(org.sameAs && { sameAs: org.sameAs }),
  };
}

/**
 * Generate WebSite structured data
 */
export function generateWebSite(site: WebSite) {
  return {
    '@context': 'https://schema.org',
    ...site,
  };
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbs(breadcrumbs: BreadcrumbList) {
  return {
    '@context': 'https://schema.org',
    ...breadcrumbs,
  };
}

/**
 * Generate ImageObject structured data
 */
export function generateImageObject(image: ImageObject) {
  return {
    '@context': 'https://schema.org',
    ...image,
  };
}

/**
 * Generate PhotoGallery structured data
 */
export function generatePhotoGallery(images: Array<{ url: string; name?: string }>, name: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name,
    url,
    image: images.map(img => ({
      '@type': 'ImageObject',
      url: img.url,
      name: img.name,
    })),
  };
}

