import { expect, test } from '@playwright/test';
import sharp from 'sharp';

import { SITE_INDEXED } from '../../src/lib/seo';

const origin = 'https://www.agentinbox.md';
test.use({ javaScriptEnabled: false });

/** What search engines are told about the website pages: left out of results until launch (`SITE_INDEXED`). */
const robotsDirective = SITE_INDEXED ? /(^|, )index, follow/ : /noindex, nofollow/;

// Both pages share the agentinbox card of /sapien until the docs page has its own.
const sharedImages: Record<string, string> = {
  '/': '/sapien/opengraph-image.jpg',
  '/sapien': '/sapien/opengraph-image.jpg',
};

for (const path of ['/', '/sapien']) {
  test(`SEO canonical and sharing metadata are present without JavaScript on ${path}`, async ({ page, request }) => {
    const response = await page.goto(`${path}?utm_source=seo-check`);
    expect(response?.status()).toBe(200);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(new URL(canonical!).href).toBe(`${origin}${path}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /@agentinbox\/cli/);
    const sharedUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(new URL(sharedUrl!).href).toBe(`${origin}${path}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', await page.title());
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', robotsDirective);
    if (!SITE_INDEXED) expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
    const image = new URL((await page.locator('meta[property="og:image"]').first().getAttribute('content'))!);
    expect(image.origin).toBe(origin);
    expect(image.pathname).toBe(sharedImages[path]);
    const twitterImage = new URL((await page.locator('meta[name="twitter:image"]').getAttribute('content'))!);
    expect(twitterImage.origin).toBe(origin);
    expect(twitterImage.pathname).toBe(image.pathname);
    const card = await request.get(`${image.pathname}${image.search}`);
    expect(card.status()).toBe(200);
    expect(card.headers()['content-type']).toContain('image/jpeg');
    const imageMetadata = await sharp(await card.body()).metadata();
    expect(imageMetadata.format).toBe('jpeg');
    expect(imageMetadata.width).toBe(1200);
    expect(imageMetadata.height).toBe(630);
    expect(response?.headers().link).toContain('rel="describedby"');
  });

  test(`SEO structured data describes the visible site on ${path}`, async ({ page }) => {
    await page.goto(path);
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(scripts.length).toBeGreaterThan(0);
    const nodes = scripts.flatMap((text) => JSON.parse(text)['@graph']);
    expect(nodes.find((node) => node['@type'] === 'WebPage').url).toBe(`${origin}${path}`);
    expect(nodes.find((node) => node['@type'] === 'WebSite').url).toBe(`${origin}/`);
    expect(nodes.find((node) => node['@type'] === 'Organization').name).toBe('Novu');
    expect(nodes.find((node) => node['@type'] === 'SoftwareSourceCode').codeRepository).toBe(
      'https://github.com/novuhq/novu/tree/next/packages/agentinbox'
    );
    expect(nodes.some((node) => node['@type'] === 'AggregateRating' || node.offers || node.aggregateRating)).toBe(
      false
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
}

test('SEO crawler files contain only production canonical pages', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  const text = await robots.text();
  expect(text).toContain('User-Agent: *');
  expect(text).toContain('Allow: /');
  // Crawling stays allowed either way, so search engines read the `noindex`.
  expect(text).not.toContain('Disallow: /');
  if (SITE_INDEXED) expect(text).toContain(`Sitemap: ${origin}/sitemap.xml`);
  else expect(text).not.toContain('Sitemap:');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toContain('xml');
  const locations = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  expect(locations.sort()).toEqual(SITE_INDEXED ? [`${origin}/`, `${origin}/sapien`].sort() : []);
});

test('SEO text versions follow the pages out of search results', async ({ request }) => {
  test.skip(SITE_INDEXED, 'Only while the website pages are kept out of search results.');
  for (const path of ['/index.md', '/llms.txt']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
  }
});

test('GEO discovery and Markdown expose the same commands without HTML noise', async ({ request, page }) => {
  const discovery = await request.get('/llms.txt');
  expect(discovery.status()).toBe(200);
  const index = await discovery.text();
  expect(index).toMatch(/^# Agent Inbox\b/);
  expect(index).toContain(`${origin}/index.md`);
  const document = await request.get('/index.md');
  expect(document.status()).toBe(200);
  expect(document.headers()['content-type']).toContain('text/markdown');
  expect(document.headers().link).toContain(`<${origin}/>; rel="canonical"`);
  const markdown = await document.text();
  await page.goto('/');
  const commands = await page.locator('.home-command-line code, #flags dt code').allTextContents();
  for (const command of commands) expect(markdown).toContain(command);
  expect(markdown).toContain('inbox show <conversation>');
  expect(markdown).toContain('~/.agentinbox/config.json');
  expect(markdown).not.toContain('<script');
  expect(markdown).not.toContain('='.repeat(80));
  await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute(
    'href',
    `${origin}/index.md`
  );
  const alias = await request.get('/human.md', { maxRedirects: 0 });
  expect(alias.status()).toBe(308);
  expect(alias.headers().location).toBe('/index.md');
});

test('SEO page metadata prevents preview indexing and retains production canonicals', async () => {
  const { pageMetadata } = await import('../../src/lib/seo');
  for (const environment of ['preview', 'development']) {
    const metadata = pageMetadata('home', environment);
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.alternates?.canonical).toBe(`${origin}/`);
  }
  expect(pageMetadata('home', 'production').robots).toMatchObject({
    index: SITE_INDEXED,
    follow: SITE_INDEXED,
  });
});
