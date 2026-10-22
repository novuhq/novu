import { expect, type Page, test } from '@playwright/test';

const relation = (page: Page) => page.locator('#hero figcaption > span');
const toggle = (page: Page) => page.locator('#hero figcaption button');

/**
 * Opens the page on a paused fake clock, so timers only run when a test moves
 * time on (an installed clock otherwise also ticks in real time, and a slow
 * load could fire a rotation early), and waits until hydration has started the
 * hero's timers.
 */
async function openOnPausedClock(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/sapien');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const button = document.querySelector('#hero figcaption button');
        return Object.keys(button ?? {}).some((key) => key.startsWith('__reactFiber'));
      })
    )
    .toBe(true);
  // React runs the effects that start the timers in a later message-channel task.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = resolve;
        channel.port2.postMessage(null);
      })
  );
}

test('hero cards rotate every 6 seconds and the caption follows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOnPausedClock(page);
  await expect(relation(page)).toContainText('presents');
  await expect(toggle(page)).toHaveAccessibleName('fig. 01 — dithering, Pause animation');
  await page.clock.fastForward(5000);
  await expect(relation(page)).toContainText('presents');
  await page.clock.fastForward(1100);
  await expect(relation(page)).toContainText('works for');
  await page.clock.fastForward(6100);
  await expect(relation(page)).toContainText('calls');
  await page.clock.fastForward(6100);
  await expect(relation(page)).toContainText('presents');
});

test('the title word cycles every 3 seconds and pauses with the toggle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOnPausedClock(page);
  const word = page.locator('#hero h1 [data-word]');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(word).toHaveAttribute('data-word', 'E-mail');
  await page.clock.fastForward(3100);
  await expect(word).toHaveAttribute('data-word', 'Telegram');
  await page.clock.fastForward(3000);
  await expect(word).toHaveAttribute('data-word', 'Slack');
  await expect(heading).toHaveAccessibleName('The E-mail inbox for AI agents');
  await toggle(page).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(12000);
  await expect(word).toHaveAttribute('data-word', 'Slack');
});

test('the caption button pauses and resumes the rotation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOnPausedClock(page);
  await toggle(page).click();
  await expect(toggle(page)).toHaveAccessibleName('fig. 01 — paused, Play animation');
  await page.mouse.move(0, 0);
  await page.clock.fastForward(30000);
  await expect(relation(page)).toContainText('presents');
  await toggle(page).click();
  await expect(toggle(page)).toHaveAccessibleName('fig. 01 — dithering, Pause animation');
  await page.clock.fastForward(8100);
  await expect(relation(page)).toContainText('works for');
});

test('hovering the stack or focusing hero controls holds the current card', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOnPausedClock(page);
  await page.locator('#hero').getByText('Business Card', { exact: true }).hover();
  await page.clock.fastForward(20000);
  await expect(relation(page)).toContainText('presents');
  await page.mouse.move(0, 0);
  await page.clock.fastForward(8100);
  await expect(relation(page)).toContainText('works for');

  await page.getByRole('group', { name: 'Hero setup command' }).getByRole('button', { name: 'Copy command' }).focus();
  await page.clock.fastForward(20000);
  await expect(relation(page)).toContainText('works for');
});

test('reduced motion starts on the first card until the visitor presses play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openOnPausedClock(page);
  await expect(toggle(page)).toHaveAccessibleName('fig. 01 — dithering, Play animation');
  await page.clock.fastForward(30000);
  await expect(relation(page)).toContainText('presents');
  await toggle(page).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(8100);
  await expect(relation(page)).toContainText('works for');
});

test('a card swap leaves no animation, filter or extra shell behind', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOnPausedClock(page);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6100);
  await expect(relation(page)).toContainText('works for');
  // The swap's animations run on the document timeline, not the fake clock.
  const figure = page.locator('#hero figure');
  await expect
    .poll(() =>
      figure.evaluate(
        (node) =>
          node.getAnimations({ subtree: true }).filter((animation) => !(animation instanceof CSSAnimation)).length
      )
    )
    .toBe(0);
  const rest = await figure.evaluate((node) => {
    // Each face wraps a card's content; the stack's other children are the shells.
    const faces = [...node.querySelectorAll<HTMLElement>('[data-card-content]')].map(
      (content) => content.parentElement!.parentElement!
    );
    const stack = faces[0].parentElement!;
    const shells = [...stack.children].filter((child) => !faces.includes(child as HTMLElement));
    return {
      faces: faces.map((face) => {
        const style = getComputedStyle(face);
        return [style.filter, style.transform, style.visibility, style.opacity];
      }),
      lastShell: getComputedStyle(shells.at(-1)!).visibility,
    };
  });
  expect(rest.faces).toEqual([
    ['none', 'none', 'hidden', '0'],
    ['none', 'none', 'visible', '1'],
    ['none', 'none', 'hidden', '0'],
  ]);
  expect(rest.lastShell).toBe('hidden');
});

test('with reduced motion a card change starts no animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openOnPausedClock(page);
  await toggle(page).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6100);
  await expect(relation(page)).toContainText('works for');
  expect(await page.locator('#hero').evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0);
});

test('the example cards are described once to assistive technology', async ({ page }) => {
  await page.goto('/sapien');
  const figure = page.getByRole('figure', {
    name: 'Example agent identity cards',
  });
  await expect(figure).toBeVisible();
  const tree = await figure.ariaSnapshot();
  expect(tree).toContain('atlas-northwind');
  expect(tree).not.toContain('Business Card');
});

test('the mobile header menu opens, closes on Escape and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/sapien');
  const header = page.locator('header');
  const menu = header.getByRole('button', { name: 'Menu' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Header navigation' })).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const nav = page.getByRole('navigation', { name: 'Header navigation' });
  await expect(nav.getByRole('link', { name: 'npm' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'sign in' })).toHaveAttribute('href', '/sign-in');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  await expect(nav).toBeHidden();
});
