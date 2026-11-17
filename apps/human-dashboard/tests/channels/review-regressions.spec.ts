import { expect, test } from '@playwright/test';

import { agentPagePairs, CHANNEL_IDS } from '../../src/data/channel-pages';

test('Markdown-preferring agents can open all thirty-three landing routes', async ({ request }) => {
  const routes = [
    ...CHANNEL_IDS.map((channel) => `/${channel}`),
    ...agentPagePairs().map(({ channel, agent }) => `/${channel}/${agent}`),
  ];
  expect(routes).toHaveLength(33);
  for (const route of routes) {
    const response = await request.get(route, { headers: { accept: 'text/markdown, text/html;q=0.9' } });
    expect(response.status(), route).toBe(200);
    expect(response.headers()['content-type'], route).toContain('text/html');
    expect(await response.text(), route).toContain('Agent Inbox');
  }
  for (const route of ['/email/general', '/telegram/unknown', '/unknown/openclaw', '/telegram.md']) {
    const response = await request.get(route, { headers: { accept: 'text/markdown, text/html;q=0.9' } });
    expect(response.status(), route).toBe(404);
    expect(response.headers()['content-type'], route).toContain('text/markdown');
  }
});

for (const route of ['/telegram', '/telegram/openclaw']) {
  test(`copying a running walkthrough pauses it on ${route}`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.goto(route);
    const setup = page.locator('#setup');
    await setup.scrollIntoViewIfNeeded();
    await expect(setup.getByRole('button', { name: 'Pause setup walkthrough' })).toBeVisible();
    await page.clock.runFor(10_100);
    await expect(setup.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
    const panel = setup.getByRole('tabpanel');
    await panel.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(setup.getByRole('button', { name: 'Play setup walkthrough' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('agentinbox setup telegram');
    await page.clock.runFor(30_000);
    await expect(setup.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
    await setup.getByRole('button', { name: 'Play setup walkthrough' }).click();
    await page.clock.runFor(10_100);
    await expect(setup.getByRole('tab').nth(2)).toHaveAttribute('aria-selected', 'true');
  });

  test(`walkthrough controls follow reduced motion changes on ${route}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await page.goto(route);
    const setup = page.locator('#setup');
    const playback = setup.getByRole('button', { name: /setup walkthrough/, includeHidden: true });
    await expect(playback).toBeHidden();
    await page.clock.runFor(20_100);
    await expect(setup.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
    // Media styles update before the asynchronous matchMedia change event starts the timer.
    await page.evaluate(() => {
      const preference = matchMedia('(prefers-reduced-motion: reduce)');
      preference.addEventListener('change', () => {
        document.documentElement.dataset.testMotionPreference = preference.matches ? 'reduce' : 'no-preference';
      });
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('html')).toHaveAttribute('data-test-motion-preference', 'no-preference');
    await expect(playback).toBeVisible();
    await page.clock.runFor(10_100);
    await expect(setup.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-test-motion-preference', 'reduce');
    await expect(playback).toBeHidden();
    await page.clock.runFor(20_100);
    await expect(setup.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
  });
}

for (const channel of CHANNEL_IDS) {
  test(`reviewed command fields copy complete values on ${channel}`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/${channel}`);
    const fields = page.locator('#who-can-reach [role="group"], #use-cases [role="group"]');
    expect(await fields.count()).toBeGreaterThan(4);
    for (const field of await fields.all()) {
      const command = await field.locator('code').textContent();
      await field.getByRole('button', { name: 'Copy command', exact: true }).click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(command);
      await expect(field.getByRole('status')).toHaveText('Command copied to clipboard');
      expect(await field.evaluate((node) => node.getBoundingClientRect().right <= innerWidth)).toBe(true);
    }
    await page.goto(`/${channel}/openclaw`);
    const capabilities = page.locator('#more-features');
    await expect(capabilities.getByRole('link')).toHaveCount(6);
    for (const link of await capabilities.getByRole('link').all()) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(new RegExp(`^/${channel}(#.+)?$`));
    }
    await capabilities.getByRole('link').first().click();
    await expect(page).toHaveURL(new RegExp(`/${channel}#message-types$`));
  });
}

for (const unavailable of [false, true]) {
  test(`long command stays readable when clipboard is ${unavailable ? 'unavailable' : 'denied'}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript((absent) => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: absent
          ? undefined
          : {
              writeText: async () => {
                throw new Error('denied');
              },
            },
      });
    }, unavailable);
    await page.goto('/slack');
    const field = page.locator('#who-can-reach [role="group"]').nth(1);
    const code = field.locator('code');
    const command = await code.textContent();
    await field.getByRole('button', { name: 'Copy command', exact: true }).click();
    await expect(field.getByRole('status')).toContainText("Couldn't copy");
    const reading = await code.evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const bounds = node.getBoundingClientRect();
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      return {
        selected: selection.toString(),
        visible: [...range.getClientRects()].every((r) => r.left >= bounds.left - 1 && r.right <= bounds.right + 1),
        height: bounds.height,
        lineHeight: Number.parseFloat(getComputedStyle(node).lineHeight),
      };
    });
    expect(reading.selected).toBe(command);
    expect(reading.visible).toBe(true);
    expect(reading.height).toBeGreaterThan(reading.lineHeight);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
