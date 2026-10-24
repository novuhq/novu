import type { MetadataRoute } from 'next';

import { HOST_IDS, hostPath } from '@/lib/hosts';
import { SITE_INDEXED, SITE_ORIGIN, SITE_PAGES } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  // Empty until search engines may index the website pages.
  if (!SITE_INDEXED) return [];

  return [...Object.values(SITE_PAGES).map((page) => page.path), ...HOST_IDS.map(hostPath)].map((path) => ({
    url: `${SITE_ORIGIN}${path}`,
  }));
}
