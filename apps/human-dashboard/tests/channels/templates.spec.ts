import { expect, test } from '@playwright/test';

import { agentPagePairs, CHANNEL_IDS } from '../../src/data/channel-pages';

const routes = [
  ...CHANNEL_IDS.map((channel) => `/${channel}`),
  ...agentPagePairs().map(({ channel, agent }) => `/${channel}/${agent}`),
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const route of routes) {
  test(`serves the complete template and metadata at ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main > section')).toHaveCount(route.split('/').length === 3 ? 7 : 10);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://www.agentinbox.md${route}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Agent Inbox|agent/);
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const image of document.images) image.loading = 'eager';
    });
    await expect
      .poll(() =>
        page
          .locator('img')
          .evaluateAll((images) =>
            images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)
          )
      )
      .toBe(true);
    if (route.split('/').length === 3) {
      await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link').last()).toHaveAttribute(
        'href',
        `/${route.split('/')[1]}`
      );
    }
    expect(errors).toEqual([]);
  });
}

for (const route of ['/email/codex', '/telegram/cursor', '/slack/hermes', '/unknown/openclaw']) {
  test(`rejects unsupported pair ${route}`, async ({ page }) => {
    expect((await page.goto(route))?.status()).toBe(404);
  });
}

test('setup and message tabs work with keyboard and update the active content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/telegram');
  const setup = page.locator('#setup');
  await setup.getByRole('tab').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(setup.getByRole('tabpanel')).toContainText('npx @agentinbox/cli setup telegram');
  await expect(setup.getByRole('button', { name: 'Play setup walkthrough' })).toBeVisible();
  const messages = page.locator('#message-types');
  await expect(messages.getByRole('tab', { name: 'Approve', exact: true })).toHaveAttribute('aria-selected', 'true');
  await messages.getByRole('tab', { name: 'Choose', exact: true }).click();
  await expect(messages.getByRole('tabpanel')).toContainText('Which table?');
  await page.keyboard.press('ArrowRight');
  await expect(messages.getByRole('tab', { name: 'Tell', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(messages.getByRole('tabpanel')).toContainText('Nightly scrape done');
});

test('copies the selected channel command and agent prompt', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/slack/codex');
  const hero = page.locator('#overview');
  await hero.getByRole('button', { name: 'Copy command', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npx @agentinbox/cli setup slack');
  await hero.getByRole('button', { name: 'Copy Prompt', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Set up Agent Inbox for Codex in Slack');
});

test('FAQ and carousel respond to keyboard and buttons', async ({ page }) => {
  await page.goto('/telegram/openclaw');
  const first = page.locator('#faq details').first();
  await expect(first).toHaveAttribute('open', '');
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(first).not.toHaveAttribute('open');
  const track = page.locator('#prompts ul');
  await expect(page.getByRole('button', { name: 'Previous prompt' })).toBeDisabled();
  await page.getByRole('button', { name: 'Next prompt' }).click();
  await expect.poll(() => track.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await track.focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => track.evaluate((node) => node.scrollLeft)).toBeLessThanOrEqual(1);
  await expect(page.locator('#get-started').getByRole('link', { name: 'Email →', exact: true })).toHaveAttribute(
    'href',
    '/email/openclaw'
  );
});

for (const width of [320, 375, 768, 1024, 1920]) {
  for (const route of ['/telegram', '/telegram/openclaw']) {
    test(`content remains readable at ${width}px on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const clipped = await page
        .locator('main h1, main h2, main h3, main p, main button, main [role=tab]')
        .evaluateAll((nodes) =>
          nodes
            .filter((node) => {
              if (!node.getClientRects().length || node.closest('[aria-hidden=true]')) return false;
              for (let parent = node.parentElement; parent; parent = parent.parentElement)
                if (/(auto|scroll)/.test(getComputedStyle(parent).overflowX)) return false;
              const bounds = node.getBoundingClientRect();
              return bounds.left < -1 || bounds.right > innerWidth + 1;
            })
            .map((node) => node.textContent)
        );
      expect(clipped).toEqual([]);
      await page.locator('#get-started').scrollIntoViewIfNeeded();
      await expect(
        page.locator('#get-started').getByRole('button', { name: 'Copy Prompt', exact: true })
      ).toBeVisible();
    });
  }
}

test('agent template remains useful without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/telegram/openclaw');
  await expect(page.getByRole('heading', { name: 'Try these prompts', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  const first = page.locator('#faq details').first();
  await first.locator('summary').click();
  await expect(first).not.toHaveAttribute('open');
  await context.close();
});

test('all channel variants fit a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of routes) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
    await expect(page.locator('main h1')).toBeVisible();
  }
});

test('template header keeps the same destinations in its mobile menu', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/telegram');
  const menu = page.locator('header').getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  const navigation = page.locator('header').getByRole('navigation', { name: 'Header navigation' });
  await expect(navigation.getByRole('link')).toHaveText(['for robots', 'npm', 'github']);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});
