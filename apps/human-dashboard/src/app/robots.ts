import type { MetadataRoute } from 'next';

import { SITE_ORIGIN } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  // Crawlers may read every page, so they see a `noindex` where indexing is off. The sitemap names the public pages.
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
