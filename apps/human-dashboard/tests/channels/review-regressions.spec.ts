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
