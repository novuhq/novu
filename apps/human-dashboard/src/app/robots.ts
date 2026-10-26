import type { MetadataRoute } from 'next';

import { SITE_INDEXED, SITE_ORIGIN } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  // Crawlers may always read the pages, so they see a `noindex`; the sitemap is offered once they may index them.
  const rules = { userAgent: '*', allow: '/' };

  return SITE_INDEXED ? { rules, sitemap: `${SITE_ORIGIN}/sitemap.xml` } : { rules };
}
