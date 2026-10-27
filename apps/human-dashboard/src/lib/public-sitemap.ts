import type { MetadataRoute } from 'next';

import { HOST_IDS, hostPath } from './hosts';
import { SITE_ORIGIN, SITE_PAGES, type SitePage } from './seo';

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

type SitemapDetails = {
  changeFrequency: ChangeFrequency;
  priority: number;
};

/**
 * How the sitemap describes a website page. A page added to `SITE_PAGES` has to be named here, or this fails
 * to compile, so `/sitemap.xml` gains it along with its canonical and its share card.
 */
function detailsFor(page: SitePage): SitemapDetails {
  switch (page) {
    case 'home':
      return { changeFrequency: 'weekly', priority: 1 };
    case 'sapien':
      return { changeFrequency: 'weekly', priority: 0.8 };
    default: {
      const exhaustive: never = page;

      return exhaustive;
    }
  }
}

/** Host setup pages change with a host's own docs, less often than the two website pages. */
const HOST_DETAILS: SitemapDetails = { changeFrequency: 'monthly', priority: 0.5 };

/**
 * The public pages search engines are shown: `/`, `/sapien`, and each host's page (`/claude-code`).
 * Signed-in pages, one-time links and the Markdown for agents stay out; those are not pages to index.
 */
export function publicSitemap(lastModified = new Date()): MetadataRoute.Sitemap {
  const pages = (Object.keys(SITE_PAGES) as SitePage[]).map((key) => {
    const page = SITE_PAGES[key];

    return {
      url: `${SITE_ORIGIN}${page.path}`,
      lastModified,
      ...detailsFor(key),
      images: [`${SITE_ORIGIN}${page.image.path}`],
    };
  });
  const hosts = HOST_IDS.map((id) => ({
    url: `${SITE_ORIGIN}${hostPath(id)}`,
    lastModified,
    ...HOST_DETAILS,
  }));

  return [...pages, ...hosts];
}
