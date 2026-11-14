import { expect, test } from '@playwright/test';
import sharp from 'sharp';

for (const route of ['/telegram', '/telegram/openclaw']) {
  for (const width of [375, 1389, 1440]) {
    for (const density of [1, 2]) {
      test(`painted corner centers match rails at ${width}px / ${density}x on ${route}`, async ({
        browser,
        baseURL,
      }) => {
        const context = await browser.newContext({
          baseURL,
          viewport: { width, height: 900 },
          deviceScaleFactor: density,
          reducedMotion: 'reduce',
        });
        try {
          const page = await context.newPage();
          await page.goto(route);
          await page.evaluate(() => document.fonts.ready);
          for (const area of ['header', '#overview']) {
            if (area === '#overview')
              await page.locator(area).evaluate((node) => {
                scrollTo({ top: scrollY + node.getBoundingClientRect().bottom - 500, behavior: 'instant' });
              });
            const points = await page.locator(area).evaluate((header) => {
              const divider = header.lastElementChild!;
              return [...divider.children].slice(1).map((node) => {
                const r = node.getBoundingClientRect();
                return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
              });
            });
            const { data, info } = await sharp(await page.screenshot())
              .removeAlpha()
              .raw()
              .toBuffer({ resolveWithObject: true });
            const scale = info.width / width;
            const pixel = (x: number, y: number, channel = 0) => data[(y * info.width + x) * info.channels + channel];
            const weightedCenter = (positions: number[], weights: number[]) => {
              const total = weights.reduce((sum, weight) => sum + weight, 0);
              expect(total).toBeGreaterThan(0);
              return positions.reduce((sum, position, index) => sum + (position + 0.5) * weights[index], 0) / total;
            };
            for (const [side, point] of points.entries()) {
              const xs = Array.from(
                { length: 16 * density },
                (_, index) => Math.floor(point.x * scale) - 8 * density + index
              );
              const ys = Array.from(
                { length: 16 * density },
                (_, index) => Math.floor(point.y * scale) - 8 * density + index
              );
              const painted: Array<{ x: number; y: number }> = [];
              for (const y of ys)
                for (const x of xs) {
                  const red = pixel(x, y),
                    green = pixel(x, y, 1);
                  if (red > 32 && red < 50 && green > 30 && green < 45) painted.push({ x: x + 0.5, y: y + 0.5 });
                }
              expect(painted.length).toBeGreaterThan(0);
              const squareX = painted.reduce((sum, point) => sum + point.x, 0) / painted.length;
              const squareY = painted.reduce((sum, point) => sum + point.y, 0) / painted.length;
              const railX = weightedCenter(
                xs,
                xs.map((x) => pixel(x, Math.round((area === 'header' ? 80 : point.y - 24) * scale)))
              );
              const lineY = weightedCenter(
                ys,
                ys.map((y) => pixel(Math.round((point.x + (side === 0 ? 20 : -20)) * scale), y))
              );
              expect(Math.abs(squareX - railX) / scale).toBeLessThan(0.1);
              expect(Math.abs(squareY - lineY) / scale).toBeLessThan(0.1);
            }
          }
        } finally {
          await context.close();
        }
      });
    }
  }
}

for (const channel of ['telegram', 'email', 'slack']) {
  for (const width of [375, 768, 1440]) {
    test(`message tabs keep panel and following content fixed on ${channel} at ${width}px`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${channel}`);
      await page.evaluate(() => document.fonts.ready);
      const section = page.locator('#message-types');
      await section.scrollIntoViewIfNeeded();
      const measurements: Array<{ panel: number; section: number; nextY: number }> = [];
      for (const name of ['Approve', 'Ask', 'Choose', 'Tell', 'Approve']) {
        await section.getByRole('tab', { name, exact: true }).click();
        await section
          .getByRole('tabpanel')
          .locator('img')
          .evaluateAll(async (images) => {
            await Promise.all(images.map((image) => (image as HTMLImageElement).decode().catch(() => undefined)));
          });
        measurements.push(
          await section.evaluate((node) => ({
            panel: node.querySelector('[role=tabpanel][data-state=active]')!.getBoundingClientRect().height,
            section: node.getBoundingClientRect().height,
            nextY: node.nextElementSibling!.getBoundingClientRect().top + scrollY,
          }))
        );
      }
      for (const current of measurements) {
        expect(Math.abs(current.panel - measurements[0].panel)).toBeLessThan(0.1);
        expect(Math.abs(current.section - measurements[0].section)).toBeLessThan(0.1);
        expect(Math.abs(current.nextY - measurements[0].nextY)).toBeLessThan(0.1);
      }
    });
  }
}
