import { describe, expect, it } from 'vitest';

import { HOST_IDS, hostPath } from './hosts';
import { publicSitemap } from './public-sitemap';
import { SITE_ORIGIN, SITE_PAGES } from './seo';

const modified = new Date('2026-10-26T00:00:00.000Z');

describe('the public sitemap', () => {
  const entries = publicSitemap(modified);

  it('lists the website pages, then each host page, at the canonical origin', () => {
    expect(entries.map((entry) => entry.url)).toEqual([
      ...Object.values(SITE_PAGES).map((page) => `${SITE_ORIGIN}${page.path}`),
      ...HOST_IDS.map((id) => `${SITE_ORIGIN}${hostPath(id)}`),
    ]);
  });

  it('describes when a page changes and how it ranks, with the share image on the website pages', () => {
    expect(entries[0]).toMatchObject({
      url: `${SITE_ORIGIN}/`,
      lastModified: modified,
      changeFrequency: 'weekly',
      priority: 1,
      images: [`${SITE_ORIGIN}${SITE_PAGES.home.image.path}`],
    });
    expect(entries.find((entry) => entry.url === `${SITE_ORIGIN}/sapien`)).toMatchObject({
      lastModified: modified,
      changeFrequency: 'weekly',
      priority: 0.8,
      images: [`${SITE_ORIGIN}${SITE_PAGES.sapien.image.path}`],
    });

    for (const id of HOST_IDS) {
      expect(entries.find((entry) => entry.url === `${SITE_ORIGIN}${hostPath(id)}`)).toEqual({
        url: `${SITE_ORIGIN}${hostPath(id)}`,
        lastModified: modified,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  });

  it('leaves out signed-in pages, one-time links, and the text agents read', () => {
    const urls = entries.map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);

    for (const path of ['/inbox', '/sign-in', '/invite/', '/verify/', '/p/', '/index.md', '/llms.txt', '/connect']) {
      expect(urls.some((url) => url.includes(path))).toBe(false);
    }
  });
});
