import { expect, test } from '@playwright/test';

for (const width of [2560, 1920, 1440, 1024, 768, 390, 360, 320]) {
  test(`page remains usable at ${width}px`, async ({ page }) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') failures.push(message.text());
    });
    page.on('response', (response) => {
      if (response.status() >= 400 && new URL(response.url()).hostname === '127.0.0.1') {
        failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/sapien');
    await page.evaluate(() => document.fonts.ready);
    for (const id of [
      'hero',
      'inbox',
      'building-blocks',
      'use-cases',
      'integrations',
      'scale',
      'security',
      'faq',
      'get-started',
    ]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    }
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
      .toBe(true);
    for (const command of await page.getByRole('group', { name: /setup command/ }).all()) {
      expect(await command.locator('code').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    }
    const clippedContent = await page.locator('h1,h2,h3,p,button,table,[role=tab]').evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          if (
            node.closest('[aria-hidden="true"]') ||
            !node.getClientRects().length ||
            getComputedStyle(node).position === 'absolute'
          )
            return false;
          // Tabs in a sideways-scrolling strip may sit past its edges.
          for (let parent = node.parentElement; parent; parent = parent.parentElement)
            if (/(auto|scroll)/.test(getComputedStyle(parent).overflowX)) return false;
          const box = node.getBoundingClientRect();
          return box.left < -1 || box.right > document.documentElement.clientWidth + 1;
        })
        .map((node) => node.textContent)
    );
    expect(clippedContent).toEqual([]);
    // Content may scroll inside a sideways scroller, but the scroller itself must fit.
    const clippedScrollers = await page.locator('body *').evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          if (
            !/(auto|scroll)/.test(getComputedStyle(node).overflowX) ||
            node.closest('[aria-hidden="true"]') ||
            !node.getClientRects().length
          )
            return false;
          const box = node.getBoundingClientRect();
          return box.left < -1 || box.right > document.documentElement.clientWidth + 1;
        })
        .map((node) => node.textContent)
    );
    expect(clippedScrollers).toEqual([]);
    await expect
      .poll(() =>
        page.locator('img:visible').evaluateAll((images) =>
          images.every((node) => {
            const image = node as HTMLImageElement;
            // A clipped continuation can have a layout box without being painted.
            // Browsers intentionally defer lazy loading those decorative images.
            let { left, right, top, bottom } = image.getBoundingClientRect();
            for (let parent = image.parentElement; parent; parent = parent.parentElement) {
              const style = getComputedStyle(parent);
              const bounds = parent.getBoundingClientRect();
              if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) {
                left = Math.max(left, bounds.left);
                right = Math.min(right, bounds.right);
              }
              if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) {
                top = Math.max(top, bounds.top);
                bottom = Math.min(bottom, bounds.bottom);
              }
            }
            if (right <= left || bottom <= top) return true;
            return image.complete && image.naturalWidth > 0;
          })
        )
      )
      .toBe(true);
    await page.locator('#building-blocks').getByRole('tab', { name: 'Choose', exact: true }).click();
    await expect(page.locator('#building-blocks').getByRole('tabpanel')).toContainText('How should I resolve Acme?');
    await page.getByRole('group', { name: 'Closing setup command' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('group', { name: 'Closing setup command' }).locator('code')).toHaveText(
      'npx @agentinbox/cli setup'
    );
    expect(failures).toEqual([]);
  });
}
