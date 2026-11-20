import type { MetadataRoute } from 'next';

import { publicSitemap } from '@/lib/public-sitemap';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicSitemap();
}
