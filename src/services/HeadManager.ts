/**
 * HeadManager - Dynamic Document Title, Meta Tags, Canonical Links, and Structured Data Manager
 */

export interface PageMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  structuredData?: Record<string, any>[];
}

const DOMAIN = 'https://readable.app';

export const HeadManager = {
  updatePageMeta(metadata: PageMetadata) {
    // 1. Update Document Title (Never say Vite or React)
    const fullTitle = metadata.title.includes('readable.app')
      ? metadata.title
      : `${metadata.title} | readable.app`;
    document.title = fullTitle;

    // 2. Helper to set or update meta tag
    const setMeta = (attrName: string, attrVal: string, contentVal: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrVal}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', contentVal);
    };

    // Standard Description
    setMeta('name', 'description', metadata.description);

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', metadata.description);
    setMeta('property', 'og:url', metadata.canonicalUrl || DOMAIN);
    setMeta('property', 'og:type', metadata.ogType || 'website');
    setMeta('property', 'og:site_name', 'readable.app');
    setMeta('property', 'og:image', `${DOMAIN}/og-image.png`);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', metadata.description);
    setMeta('name', 'twitter:image', `${DOMAIN}/og-image.png`);

    // 3. Canonical Tag
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', metadata.canonicalUrl);

    // 4. Inject Dynamic JSON-LD Structured Data
    // Remove existing dynamic script
    const existingJsonLd = document.getElementById('dynamic-jsonld');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const jsonLdItems: Record<string, any>[] = [];

    // Breadcrumbs JSON-LD
    if (metadata.breadcrumbs && metadata.breadcrumbs.length > 0) {
      jsonLdItems.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': metadata.breadcrumbs.map((b, idx) => ({
          '@type': 'ListItem',
          'position': idx + 1,
          'name': b.name,
          'item': b.url.startsWith('http') ? b.url : `${DOMAIN}${b.url}`
        }))
      });
    }

    // Additional structured data if provided
    if (metadata.structuredData) {
      jsonLdItems.push(...metadata.structuredData);
    }

    if (jsonLdItems.length > 0) {
      const script = document.createElement('script');
      script.id = 'dynamic-jsonld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLdItems);
      document.head.appendChild(script);
    }
  }
};
