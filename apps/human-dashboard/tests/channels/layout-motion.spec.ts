import { expect, test } from '@playwright/test';

for (const route of ['/telegram', '/telegram/openclaw']) {
  for (const width of [375, 1440]) {
    test(`hero rails stay aligned and unclipped at ${width}px on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const hero = document.querySelector<HTMLElement>('#overview')!;
        const header = document.querySelector('header')!;
        const rect = hero.getBoundingClientRect();
        const style = getComputedStyle(hero);
        const rail = getComputedStyle(hero, '::before');
        const railStart = rect.left + Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(rail.left);
        const railCenters = [
          railStart + Number.parseFloat(rail.borderLeftWidth) / 2,
          railStart + Number.parseFloat(rail.width) - Number.parseFloat(rail.borderRightWidth) / 2,
        ];
        const intersections = [header.lastElementChild!, hero.lastElementChild!].map((divider) => {
          const [line, left, right] = [...divider.children].map((node) => node.getBoundingClientRect());
          return {
            lineY: line.y + line.height / 2,
            pins: [left, right].map((pin) => ({ x: pin.x + pin.width / 2, y: pin.y + pin.height / 2 })),
          };
        });
        return {
          railCenters,
          intersections,
          heroOverflow: style.overflow,
          illustrationOverflow: getComputedStyle(hero.querySelector('[data-prime-audit-id="hero-media"]')!).overflow,
        };
      });
      expect(result.heroOverflow).toBe('visible');
      expect(result.illustrationOverflow).toBe('hidden');
      for (const intersection of result.intersections) {
        for (const [index, pin] of intersection.pins.entries()) {
          expect(Math.abs(pin.x - result.railCenters[index])).toBeLessThan(0.1);
          expect(Math.abs(pin.y - intersection.lineY)).toBeLessThan(0.1);
        }
      }
    });
  }

  test(`setup tabs interpolate and handle interrupted selection on ${route}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(route);
    const setup = page.locator('#setup');
    await setup.scrollIntoViewIfNeeded();
    await setup.getByRole('button', { name: 'Pause setup walkthrough' }).click();
    const descriptions = setup.locator('[data-setup-description]');
    const before = await descriptions.first().evaluate((node) => node.getBoundingClientRect().height);
    await page.evaluate(() => {
      const tabs = document.querySelector('#setup [role=tablist]')!;
      const sample = () =>
        [...tabs.querySelectorAll('[data-setup-description]')].map((node) => node.getBoundingClientRect().height);
      const recording = new Promise<number[][]>((resolve) => {
        const observer = new MutationObserver(() => {
          observer.disconnect();
          const samples = [sample()];
          const start = performance.now();
          const frame = () => {
            samples.push(sample());
            if (performance.now() - start < 320) requestAnimationFrame(frame);
            else resolve(samples);
          };
          requestAnimationFrame(frame);
        });
        observer.observe(tabs, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
      });
      Object.assign(window, { setupMotionRecording: recording });
    });
    await setup.getByRole('tab').nth(1).click();
    const samples = await page.evaluate(
      () => (window as unknown as { setupMotionRecording: Promise<number[][]> }).setupMotionRecording
    );
    const intermediate = samples.filter(([height]) => height > 0.5 && height < before - 0.5);
    expect(intermediate.length).toBeGreaterThan(2);
    expect(samples.at(-1)![0]).toBeLessThan(0.1);
    expect(samples.at(-1)![1]).toBeGreaterThan(20);
    for (let index = 1; index < samples.length; index++) {
      expect(samples[index][0]).toBeLessThanOrEqual(samples[index - 1][0] + 0.5);
    }
    // Reverse an in-flight transition rather than waiting for each disclosure to finish.
    await setup.getByRole('tab').first().click();
    await page.waitForTimeout(50);
    await setup.getByRole('tab').nth(1).click();
    await expect(setup.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() => descriptions.first().evaluate((node) => node.getBoundingClientRect().height))
      .toBeLessThan(0.1);
    await expect(setup.getByRole('tabpanel')).toContainText('setup telegram');
  });

  test(`setup tab disclosures respect reduced motion on ${route}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    const setup = page.locator('#setup');
    await setup.getByRole('tab').nth(1).click();
    const descriptions = setup.locator('[data-setup-description]');
    expect(await descriptions.first().evaluate((node) => node.getBoundingClientRect().height)).toBe(0);
    expect(await descriptions.nth(1).evaluate((node) => node.getAnimations().length)).toBe(0);
    await expect(descriptions.first()).toHaveAttribute('aria-hidden', 'true');
    await expect(descriptions.nth(1)).toHaveAttribute('aria-hidden', 'false');
  });
}
