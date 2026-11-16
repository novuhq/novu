import { expect, test } from '@playwright/test';

import { BOOK_DEMO_HREF } from '../../src/data/sapien-scale';

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`pricing is complete and fits at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    expect((await page.goto('/pricing'))?.status()).toBe(200);
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const image of document.images) image.loading = 'eager';
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    await expect(page.locator('main h1')).toHaveCount(1);
    const plans = page.locator('#plans');
    await expect(plans.getByRole('article')).toHaveCount(3);
    await expect(plans.getByRole('article', { name: 'Hobby', exact: true })).toContainText('$0');
    await expect(plans.getByRole('article', { name: 'Pro', exact: true })).toContainText('$10');
    await expect(plans.getByRole('article', { name: 'Pro', exact: true })).toContainText('500');
    await expect(plans.getByRole('article', { name: 'Enterprise', exact: true })).toContainText('Custom');
    const table = page.getByRole('table', { name: 'Agent Inbox plan comparison', includeHidden: true });
    await expect(table).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(11);
    if (width >= 768) {
      await expect(table.getByRole('row', { name: 'Agent inboxes 1 10 Custom', exact: true })).toBeVisible();
      const featureTops = await plans
        .locator('article dl')
        .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
      expect(Math.max(...featureTops) - Math.min(...featureTops)).toBeLessThan(1);
    } else {
      const region = page.getByRole('region', { name: 'Compare plans', exact: true });
      await region.evaluate((node) => node.scrollIntoView({ block: 'start' }));
      const firstLabel = table.locator('tbody th').first();
      const initialX = (await firstLabel.boundingBox())!.x;
      await region.focus();
      await region.press('ArrowRight');
      await expect.poll(() => region.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
      // Native touch/trackpad scrolling must expose the last plan without moving feature labels.
      await region.evaluate((node) => node.scrollTo({ left: node.scrollWidth }));
      await expect(table.getByRole('columnheader', { name: 'Enterprise', exact: true })).toBeInViewport();
      const hiddenValues = await region.evaluate((node) => {
        const left = node.querySelector('tbody th')!.getBoundingClientRect().right;
        const right = node.getBoundingClientRect().right;
        return [...node.querySelectorAll('tbody tr')]
          .filter((row) => {
            const cell = row.lastElementChild!;
            const icon = cell.querySelector('svg');
            if (icon) {
              const r = icon.getBoundingClientRect();
              return r.left < left - 1 || r.right > right + 1;
            }
            const range = document.createRange();
            range.selectNodeContents(cell);
            return [...range.getClientRects()].some((r) => r.left < left - 1 || r.right > right + 1);
          })
          .map((row) => row.lastElementChild!.textContent);
      });
      expect(hiddenValues).toEqual([]);
      expect(Math.abs((await firstLabel.boundingBox())!.x - initialX)).toBeLessThan(1);
      await region.evaluate((node) => node.scrollTo({ left: 0 }));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const clipped = await page
      .locator('#plans a, #comparison, footer')
      .evaluateAll((nodes) => nodes.some((node) => node.getBoundingClientRect().right > innerWidth + 1));
    expect(clipped).toBe(false);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`pricing-${width}.png`), fullPage: true });
  });
}

test('pricing is registered for metadata, crawlers and Markdown-preferring requests', async ({ page, request }) => {
  await page.goto('/pricing');
  await expect(page).toHaveTitle('Agent Inbox pricing | Hobby, Pro and Enterprise');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.agentinbox.md/pricing');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\$10\/month/);
  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)['@graph'];
  const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
  expect(faq.mainEntity).toHaveLength(4);
  expect((await request.get('/sitemap.xml')).ok()).toBe(true);
  expect(await (await request.get('/sitemap.xml')).text()).toContain('<loc>https://www.agentinbox.md/pricing</loc>');
  const markdown = await request.get('/pricing', { headers: { Accept: 'text/markdown' } });
  expect(markdown.status()).toBe(200);
  expect(await markdown.text()).not.toContain('This page could not be found');
});

test('plan actions use the existing account and Enterprise entry points', async ({ page }) => {
  await page.goto('/pricing');
  const plans = page.locator('#plans');
  await expect(plans.getByRole('link', { name: 'Start for free: Hobby' })).toHaveAttribute('href', '/inbox');
  await expect(plans.getByRole('link', { name: 'Get started: Pro' })).toHaveAttribute('href', '/inbox');
  await expect(plans.getByRole('link', { name: 'Talk to us: Enterprise' })).toHaveAttribute('href', BOOK_DEMO_HREF);
  await expect(page.getByRole('button', { name: /annual|monthly/i })).toHaveCount(0);
});

test('all FAQ disclosures work with keyboard input and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pricing');
  for (const details of await page.locator('#faq details').all()) {
    const summary = details.locator('summary');
    if ((await details.getAttribute('open')) !== null) await summary.press('Enter');
    await expect(details).not.toHaveAttribute('open');
    await summary.press('Enter');
    await expect(details).toHaveAttribute('open');
    await expect(details.locator('p')).toBeVisible();
    await summary.press('Space');
    await expect(details).not.toHaveAttribute('open');
  }
});

test('the shared footer discovers pricing and the hero uses the reviewed title', async ({ page }) => {
  await page.goto('/sapien');
  await page.locator('footer').getByRole('link', { name: 'pricing', exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator('h1')).toHaveText('Built for agents. Priced by conversation');
  await expect(page.getByRole('link', { name: 'Compare all features' })).toHaveCount(0);
});

test('the mobile menu opens, closes and restores keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/pricing');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Header navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});

test('shared landing footers still fit at narrow and tablet widths', async ({ page }) => {
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/sapien', '/telegram', '/telegram/openclaw']) {
      await page.goto(route);
      await expect(page.locator('footer').getByRole('link', { name: 'pricing', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(await page.locator('footer p').evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    }
  }
});

test('pricing content and native FAQ controls work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  try {
    const page = await context.newPage();
    await page.goto('/pricing');
    await expect(page.getByRole('article', { name: 'Pro', exact: true })).toContainText('$10');
    const item = page.locator('#faq details').nth(1);
    await item.locator('summary').click();
    await expect(item).toHaveAttribute('open');
    await expect(item.locator('p')).toBeVisible();
    const comparison = page.getByRole('region', { name: 'Compare plans', exact: true });
    await comparison.evaluate((node) => node.scrollIntoView({ block: 'start' }));
    await comparison.evaluate((node) => node.scrollTo({ left: node.scrollWidth }));
    await expect(comparison.getByRole('columnheader', { name: 'Enterprise', exact: true })).toBeInViewport();
  } finally {
    await context.close();
  }
});
