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
  await expect(relation(page)).toContainText('hands out');
  await expect(toggle(page)).toHaveAccessibleName('fig. 01 — dithering, Pause animation');
  await page.clock.fastForward(5000);
  await expect(relation(page)).toContainText('hands out');
  await page.clock.fastForward(1100);
  await expect(relation(page)).toContainText('works for');
  await page.clock.fastForward(6100);
  await expect(relation(page)).toContainText('calls');
  await page.clock.fastForward(6100);
  await expect(relation(page)).toContainText('hands out');
});

test('the agent and channel pills swap in place while the title stays put', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOnPausedClock(page);
  const heading = page.getByRole('heading', { level: 1 });
  const agent = page.locator('#hero [data-token="agent"]');
  const channel = page.locator('#hero [data-token="channel"]');
  const name =
    'Get your ChatGPT, Grok Bot, Claude or OpenClaw agent on Slack, Telegram or Email with everyone around you.';
  await expect(heading).toHaveAccessibleName(name);
  await expect(page.locator('#hero p').first()).toHaveText(
    'Your team, family and customers write to it. It reads, asks and answers, all from one inbox.'
  );
  await expect(agent).toHaveAttribute('data-current', 'ChatGPT');
  await expect(channel).toHaveAttribute('data-current', 'Slack');
  await page.clock.fastForward(3100);
  await expect(agent).toHaveAttribute('data-current', 'Grok Bot');
  await expect(channel).toHaveAttribute('data-current', 'Telegram');
  await expect(heading).toHaveAccessibleName(name);
  await toggle(page).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(12000);
  await expect(agent).toHaveAttribute('data-current', 'Grok Bot');
});

for (const width of [390, 1440]) {
  test(`the headline stays two lines through every pair at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openOnPausedClock(page);
    await page.evaluate(() => document.fonts.ready);
    const lineCount = () =>
      page
        .locator('#hero h1')
        .evaluate((heading) =>
          [...heading.querySelectorAll(':scope > [aria-hidden="true"]')].map((line) => line.getClientRects().length)
        );

    for (let step = 0; step < 12; step++) {
      if (step > 0) await page.clock.fastForward(3100);
      await expect.poll(lineCount).toEqual([1, 1]);
    }
  });
}

test('the caption button pauses and resumes the rotation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOnPausedClock(page);
  await toggle(page).click();
  await expect(toggle(page)).toHaveAccessibleName('fig. 01 — paused, Play animation');
  await page.mouse.move(0, 0);
  await page.clock.fastForward(30000);
  await expect(relation(page)).toContainText('hands out');
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
  await expect(relation(page)).toContainText('hands out');
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
  await expect(relation(page)).toContainText('hands out');
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
  await expect(nav.getByRole('link', { name: 'book a demo' })).toHaveAttribute(
    'href',
    'https://cal.com/team/novu/novu-meeting'
  );
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  await expect(nav).toBeHidden();
});
