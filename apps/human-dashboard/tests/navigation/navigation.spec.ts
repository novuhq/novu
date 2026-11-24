import { expect, type Locator, type Page, test } from '@playwright/test';

const SOURCE = 'https://github.com/novuhq/novu/tree/next/packages/agentinbox';
const DEMO = 'https://cal.com/team/novu/novu-meeting';
const CHANNELS = ['Email', 'Telegram', 'Slack'];

const header = (page: Page) => page.locator('header');
const channelsButton = (page: Page) => header(page).getByRole('button', { name: 'channels', exact: true });
const menuButton = (page: Page) => header(page).getByRole('button', { name: 'Menu', exact: true });
const channelLink = (page: Page, name: string) =>
  header(page).getByRole('link', { name: new RegExp(`^${name} Its own`) });
const agents = (page: Page, channel: string) =>
  header(page).getByRole('list', { name: `Connect an agent: ${channel}`, exact: true });
const box = async (locator: Locator) => (await locator.boundingBox())!;
const scrolled = (page: Page) => page.evaluate(() => scrollY);

/** The panel a disclosure button opens. Its id comes from React, so it is matched as an attribute. */
async function panelOf(page: Page, button: Locator) {
  return page.locator(`[id="${await button.getAttribute('aria-controls')}"]`);
}

async function expectAgents(page: Page, channel: string) {
  for (const name of CHANNELS) {
    await expect(agents(page, name)).toHaveAttribute('data-active', String(name === channel));
    await expect(agents(page, name)).toHaveCSS('opacity', name === channel ? '1' : '0');
  }
}

test.describe('desktop header', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('the row sits where the design puts it', async ({ page }) => {
    await page.goto('/use-cases');
    await page.evaluate(() => document.fonts.ready);
    const navigation = header(page).getByRole('navigation', { name: 'Header navigation' });
    const link = (name: string) => navigation.getByRole('link', { name, exact: true });
    await expect(channelsButton(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(link('use cases')).toHaveAttribute('href', '/use-cases');
    await expect(link('use cases')).toHaveAttribute('aria-current', 'page');
    await expect(link('pricing')).toHaveAttribute('href', '/pricing');
    await expect(link('pricing')).not.toHaveAttribute('aria-current', 'page');
    await expect(link('GitHub')).toHaveAttribute('href', SOURCE);
    await expect(link('dashboard')).toHaveAttribute('href', '/inbox');
    await expect(link('book a demo')).toHaveAttribute('href', DEMO);

    // Figma `1632:32067` at 1920: a 50px row, the logo at 488, the links from 682, the buttons up to 1432.
    expect(await box(header(page))).toEqual({ x: 480, y: 0, width: 960, height: 50 });
    expect(await box(header(page).getByRole('link', { name: 'agentinbox' }))).toEqual({
      x: 488,
      y: 8,
      width: 146,
      height: 34,
    });
    expect((await box(channelsButton(page))).x).toBe(682);
    await expect(channelsButton(page)).toHaveCSS('font-size', '13px');
    await expect(channelsButton(page)).toHaveCSS('letter-spacing', '-0.26px');
    const source = await box(link('GitHub'));
    expect(source).toMatchObject({ y: 9, width: 32, height: 32 });
    expect(Math.abs(source.x - 1154)).toBeLessThan(1);
    const demo = await box(link('book a demo'));
    expect(demo.x + demo.width).toBeCloseTo(1432, 0);
    expect(demo).toMatchObject({ y: 9, height: 32 });
    await expect(link('book a demo')).toHaveCSS('font-size', '14px');

    // Black at 85% over a 6px blur, from one edge of the window to the other.
    const backdrop = header(page).locator('> span[aria-hidden]');
    expect(await box(backdrop)).toEqual({ x: 0, y: 0, width: 1920, height: 50 });
    await expect(backdrop).toHaveCSS('backdrop-filter', 'blur(6px)');
    await expect(backdrop).toHaveCSS('background-color', /0\.85\)$/);
  });

  test('the header stays at the top of the window, and focusing it leaves the page where it is', async ({ page }) => {
    await page.goto('/sapien');
    await page.evaluate(() => scrollTo({ top: 1600, behavior: 'instant' }));
    expect(await scrolled(page)).toBe(1600);
    expect((await box(header(page))).y).toBe(0);
    // Whatever scrolls under it is behind it: the header is what a pointer over it meets.
    expect(await page.evaluate(() => !!document.elementFromPoint(innerWidth / 2 - 380, 25)?.closest('header'))).toBe(
      true
    );

    await channelsButton(page).click();
    await expect(channelLink(page, 'Email')).toBeVisible();
    expect(await scrolled(page)).toBe(1600);
    await page.keyboard.press('Tab');
    await expect(channelLink(page, 'Email')).toBeFocused();
    expect(await scrolled(page)).toBe(1600);
    await page.keyboard.press('Escape');
    await expect(channelsButton(page)).toBeFocused();
    expect(await scrolled(page)).toBe(1600);
    await page.keyboard.press('Shift+Tab');
    await expect(header(page).getByRole('link', { name: 'agentinbox' })).toBeFocused();
    expect(await scrolled(page)).toBe(1600);
    for (const name of ['channels', 'use cases', 'pricing', 'GitHub', 'dashboard', 'book a demo']) {
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAccessibleName(name);
      expect(await scrolled(page), name).toBe(1600);
    }
  });

  test('a section a link leads to, and a control that takes the focus, stop under the header', async ({ page }) => {
    await page.goto('/telegram#setup');
    await expect
      .poll(() => page.locator('#setup').evaluate((node) => node.getBoundingClientRect().top))
      .toBeCloseTo(51, 0);
    await page.goto('/use-cases#approvals');
    // Its own 16px of air, under the header's 51.
    await expect
      .poll(() => page.locator('#approvals').evaluate((node) => node.getBoundingClientRect().top))
      .toBeCloseTo(67, 0);

    // A link the window shows, but the header covers: the browser leaves it there, so the page moves it out.
    await page.goto('/pricing');
    const tops = await page.evaluate(() => {
      const link = [...document.querySelectorAll<HTMLElement>('main a')].find(
        (node) => node.getBoundingClientRect().top > 400
      )!;
      scrollTo({ top: scrollY + link.getBoundingClientRect().top - 20, behavior: 'instant' });
      const before = link.getBoundingClientRect().top;
      link.focus();

      return { before, after: link.getBoundingClientRect().top };
    });
    expect(tops.before).toBeCloseTo(20, 0);
    expect(tops.after).toBeCloseTo(51, 0);
  });

  test('pointing at channels opens the menu, and each channel shows its agents', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => ['error', 'warning'].includes(message.type()) && errors.push(message.text()));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/use-cases');
    await page.evaluate(() => document.fonts.ready);
    const panel = await panelOf(page, channelsButton(page));
    await expect(panel).toBeHidden();
    await expect(channelsButton(page).locator('img')).toHaveCSS('rotate', 'none');

    await channelsButton(page).hover();
    await expect(panel).toBeVisible();
    await expect(channelsButton(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(channelsButton(page).locator('img')).toHaveCSS('rotate', '180deg');
    await expect(channelsButton(page).locator('img')).toHaveCSS('opacity', '1');
    // Figma `1661:10455`: 512 by 208, under the header's line, 24px left of the label.
    expect(await box(panel)).toEqual({ x: 658, y: 50, width: 512, height: 208 });
    await expectAgents(page, 'Email');
    await expect(agents(page, 'Email').getByRole('link')).toHaveText(['OpenClaw']);

    // Three 220 by 60 rows, 2px apart, 12px inside the 244px column; each with a 36px tile.
    for (const [index, name] of CHANNELS.entries()) {
      expect(await box(channelLink(page, name)), name).toEqual({ x: 670, y: 62 + 62 * index, width: 220, height: 60 });
      expect(await box(channelLink(page, name).locator('> span').first()), name).toEqual({
        x: 682,
        y: 74 + 62 * index,
        width: 36,
        height: 36,
      });
    }
    expect(await box(panel.locator('> span[aria-hidden]'))).toEqual({ x: 658, y: 50, width: 244, height: 208 });
    const label = panel.getByText('Connect an agent', { exact: true });
    expect(await box(label)).toMatchObject({ x: 926, y: 75, height: 10 });
    await expect(label).toHaveCSS('text-transform', 'uppercase');
    await expect(label).toHaveCSS('font-size', '10px');

    // A channel under the pointer shows its agents at once: no wait unless the pointer is on its way to them.
    await channelLink(page, 'Telegram').hover();
    await expect(agents(page, 'Telegram')).toHaveAttribute('data-active', 'true', { timeout: 200 });
    await expectAgents(page, 'Telegram');
    await expect(agents(page, 'Telegram').getByRole('link')).toHaveText(['OpenClaw', 'Claude Code', 'Hermes']);

    await channelLink(page, 'Slack').hover();
    await expect(agents(page, 'Slack')).toHaveAttribute('data-active', 'true', { timeout: 200 });
    await expectAgents(page, 'Slack');
    await expect(agents(page, 'Slack').getByRole('link')).toHaveText(['Claude Code', 'OpenClaw', 'Codex', 'Cursor']);
    // 188 by 32 rows, 2px apart, from 256 across and 40 down; each with a 16px tile that holds its logo whole.
    for (const [index, agent] of (await agents(page, 'Slack').getByRole('link').all()).entries())
      expect(await box(agent)).toEqual({ x: 914, y: 90 + 34 * index, width: 188, height: 32 });
    expect(await box(panel)).toEqual({ x: 658, y: 50, width: 512, height: 208 });

    // Leaving closes it, and the next visit starts from the first channel again.
    await page.mouse.move(300, 600);
    await expect(panel).toBeHidden();
    await expect(channelsButton(page)).toHaveAttribute('aria-expanded', 'false');
    await channelsButton(page).hover();
    await expectAgents(page, 'Email');
    expect(errors).toEqual([]);
  });

  test('crossing a channel on the way to the agents keeps the agents', async ({ page }) => {
    await page.goto('/use-cases');
    await channelsButton(page).hover();
    await channelLink(page, 'Slack').hover();
    await expectAgents(page, 'Slack');
    const target = await box(agents(page, 'Slack').getByRole('link', { name: 'Claude Code' }));
    const telegram = await box(channelLink(page, 'Telegram'));
    const slack = await box(channelLink(page, 'Slack'));
    // The straight line from Slack to its first agent runs over Telegram's row.
    const from = { x: slack.x + slack.width / 2, y: slack.y + slack.height / 2 };
    const to = { x: target.x + 40, y: target.y + target.height / 2 };
    const yAtEdge = from.y + ((to.y - from.y) * (telegram.x + telegram.width - from.x)) / (to.x - from.x);
    expect(yAtEdge).toBeGreaterThan(telegram.y);
    expect(yAtEdge).toBeLessThan(telegram.y + telegram.height);

    await page.mouse.move(to.x, to.y, { steps: 12 });
    await expectAgents(page, 'Slack');
    await page.waitForTimeout(500);
    await expectAgents(page, 'Slack');
    await agents(page, 'Slack').getByRole('link', { name: 'Claude Code' }).click();
    await expect(page).toHaveURL(/\/slack\/claude-code$/);
  });

  test('a pointer that stops on a channel it was crossing gets that channel, after a pause', async ({ page }) => {
    await page.goto('/use-cases');
    await channelsButton(page).hover();
    await channelLink(page, 'Slack').hover();
    await expectAgents(page, 'Slack');
    // When the pointer comes onto Telegram's row, and when Telegram's agents show.
    await page.evaluate(() => {
      const times = document.documentElement.dataset;
      const row = [...document.querySelectorAll('header a[href="/telegram"]')].find((node) => node.checkVisibility())!;
      row.addEventListener('pointerenter', () => {
        times.entered = String(performance.now());
      });
      const list = document.querySelector('header ul[aria-label="Connect an agent: Telegram"]')!;
      new MutationObserver(() => {
        if (list.getAttribute('data-active') === 'true') times.shown ??= String(performance.now());
      }).observe(list, { attributes: true });
    });
    const telegram = await box(channelLink(page, 'Telegram'));
    // Up and to the right, as if on the way to the agents, but stopping on Telegram.
    await page.mouse.move(telegram.x + telegram.width - 20, telegram.y + telegram.height / 2, { steps: 8 });
    await expectAgents(page, 'Telegram');
    const { entered, shown } = await page.evaluate(() => document.documentElement.dataset);
    // It waited to see where the pointer was going, and no longer than that takes.
    expect(Number(shown) - Number(entered)).toBeGreaterThan(200);
    expect(Number(shown) - Number(entered)).toBeLessThan(1500);
  });

  test('a click keeps the menu open until Escape, a second click or a click elsewhere', async ({ page }) => {
    await page.goto('/use-cases');
    const panel = await panelOf(page, channelsButton(page));
    await channelsButton(page).click();
    await expect(panel).toBeVisible();
    await page.mouse.move(300, 600);
    await page.waitForTimeout(700);
    await expect(panel).toBeVisible();

    // Escape from inside the panel closes it and hands the focus back to the button.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(agents(page, 'Email').getByRole('link', { name: 'OpenClaw' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(channelsButton(page)).toBeFocused();

    await channelsButton(page).click();
    await expect(panel).toBeVisible();
    await channelsButton(page).click();
    await expect(panel).toBeHidden();

    await channelsButton(page).click();
    await expect(panel).toBeVisible();
    await page.mouse.click(300, 600);
    await expect(panel).toBeHidden();
  });

  test('the keyboard reaches every channel and its agents in turn', async ({ page }) => {
    await page.goto('/use-cases');
    const panel = await panelOf(page, channelsButton(page));
    await channelsButton(page).focus();
    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();

    const order: Array<[channel: string, name: RegExp]> = [
      ['Email', /^Email Its own email address$/],
      ['Email', /^OpenClaw$/],
      ['Telegram', /^Telegram Its own Telegram bot$/],
      ['Telegram', /^OpenClaw$/],
      ['Telegram', /^Claude Code$/],
      ['Telegram', /^Hermes$/],
      ['Slack', /^Slack Its own Slack app$/],
      ['Slack', /^Claude Code$/],
      ['Slack', /^OpenClaw$/],
      ['Slack', /^Codex$/],
      ['Slack', /^Cursor$/],
    ];
    for (const [channel, name] of order) {
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAccessibleName(name);
      await expect(panel).toBeVisible();
      await expectAgents(page, channel);
    }
    // Back the same way: the agents on show follow the focus.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(':focus')).toHaveAccessibleName(/^Hermes$/);
    await expectAgents(page, 'Telegram');
    for (let stop = 0; stop < 5; stop++) await page.keyboard.press('Tab');

    // The next stop is past the menu, which closes behind the focus.
    await page.keyboard.press('Tab');
    await expect(header(page).getByRole('link', { name: 'use cases', exact: true })).toBeFocused();
    await expect(panel).toBeHidden();
    await expect(channelsButton(page)).toHaveAttribute('aria-expanded', 'false');

    // And back before it: out of the menu at its front, to the logo.
    await page.keyboard.press('Shift+Tab');
    await expect(channelsButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(channelLink(page, 'Email')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(channelsButton(page)).toBeFocused();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    await expect(header(page).getByRole('link', { name: 'agentinbox' })).toBeFocused();
    await expect(panel).toBeHidden();
  });

  test("the keyboard's focus holds a menu the pointer opened, and its agents", async ({ page }) => {
    await page.goto('/use-cases');
    const panel = await panelOf(page, channelsButton(page));
    await channelsButton(page).focus();
    await channelsButton(page).hover();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(channelLink(page, 'Email')).toBeFocused();
    // The pointer leaves: closing now would drop the focus with the panel.
    await page.mouse.move(300, 600, { steps: 4 });
    await page.waitForTimeout(700);
    await expect(panel).toBeVisible();
    await expect(channelLink(page, 'Email')).toBeFocused();

    // On an agent, the focus keeps that agent's list on show while the pointer is over another channel.
    await page.keyboard.press('Tab');
    await expect(agents(page, 'Email').getByRole('link', { name: 'OpenClaw' })).toBeFocused();
    await channelLink(page, 'Slack').hover();
    await page.waitForTimeout(500);
    await expectAgents(page, 'Email');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/email\/openclaw$/);
  });

  test('the focus holds the menu when it enters just after the pointer has left', async ({ page }) => {
    await page.goto('/use-cases');
    const panel = await panelOf(page, channelsButton(page));
    await channelsButton(page).focus();
    await channelsButton(page).hover();
    await expect(panel).toBeVisible();
    // The pointer leaves, which starts the wait before closing; the keyboard moves in before it is over.
    await page.mouse.move(300, 600);
    await page.keyboard.press('Tab');
    await expect(channelLink(page, 'Email')).toBeFocused();
    await page.waitForTimeout(700);
    await expect(panel).toBeVisible();
    await expect(channelsButton(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(channelLink(page, 'Email')).toBeFocused();
    // Without the keyboard in it, the same wait closes the menu.
    await page.keyboard.press('Escape');
    await channelsButton(page).hover();
    await expect(panel).toBeVisible();
    await page.mouse.move(300, 600);
    await expect(panel).toBeHidden();
  });

  test('the menu leads to the channel and agent pages and names the page that is open', async ({ page }) => {
    await page.goto('/use-cases');
    await channelsButton(page).hover();
    await channelLink(page, 'Telegram').click();
    await expect(page).toHaveURL(/\/telegram$/);
    // The header is a new one on the new page: its button says whether its menu is open.
    await expect(channelsButton(page)).toHaveAttribute('aria-expanded', 'false');

    await page.mouse.move(300, 600);
    await channelsButton(page).click();
    await expect(channelLink(page, 'Telegram')).toHaveAttribute('aria-current', 'page');
    await expect(channelLink(page, 'Email')).not.toHaveAttribute('aria-current', 'page');
    await channelLink(page, 'Slack').hover();
    await agents(page, 'Slack').getByRole('link', { name: 'Codex' }).click();
    await expect(page).toHaveURL(/\/slack\/codex$/);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(channelsButton(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('a link opened in another tab leaves the menu open', async ({ page, context }) => {
    await page.goto('/use-cases');
    await channelsButton(page).click();
    await channelLink(page, 'Slack').hover();
    const opened = context.waitForEvent('page');
    await agents(page, 'Slack')
      .getByRole('link', { name: 'Codex' })
      .click({ modifiers: ['ControlOrMeta'] });
    await (await opened).waitForURL(/\/slack\/codex$/);
    await expect(page).toHaveURL(/\/use-cases$/);
    await expect(channelsButton(page)).toHaveAttribute('aria-expanded', 'true');
    // The agent that was clicked lets go of the focus when the pointer picks another channel.
    await channelLink(page, 'Telegram').hover();
    await expectAgents(page, 'Telegram');
    await expect(agents(page, 'Slack').getByRole('link', { name: 'Codex' })).not.toBeFocused();
  });

  test("every drawing in the header and footer loads at its file's size, inside its tile", async ({
    page,
    request,
  }) => {
    await page.goto('/use-cases');
    // The footer's drawings load once they are near the window; the header stays on show above it.
    await page.locator('footer').scrollIntoViewIfNeeded();
    await channelsButton(page).click();
    // Those on show: the small-screen menu keeps its own copies, which the desktop row never displays.
    const drawings = await page.locator('header img, footer img').evaluateAll(async (images) => {
      const shown = (images as HTMLImageElement[]).filter((image) => image.checkVisibility());
      await Promise.all(shown.map((image) => image.decode().catch(() => undefined)));

      return shown.map((image) => ({
        src: image.getAttribute('src')!,
        loaded: image.complete && image.naturalWidth > 0,
        width: image.getBoundingClientRect().width,
        height: image.getBoundingClientRect().height,
      }));
    });
    expect([...new Set(drawings.map(({ src }) => src))].sort()).toEqual([
      '/images/navigation/agent-claude-code.svg',
      '/images/navigation/agent-codex.svg',
      '/images/navigation/agent-cursor.svg',
      '/images/navigation/agent-hermes.svg',
      '/images/navigation/agent-openclaw.svg',
      '/images/navigation/channel-email.svg',
      '/images/navigation/channel-slack.svg',
      '/images/navigation/channel-telegram.svg',
      '/images/navigation/chevron-down.svg',
      '/images/navigation/github.svg',
      '/images/sapien/footer/imgLogomarkConcept.svg',
      '/images/sapien/header/imgLogomarkConcept.svg',
    ]);
    for (const drawing of drawings) {
      expect(drawing.loaded, drawing.src).toBe(true);
      const root = (await (await request.get(drawing.src)).text()).match(/<svg[^>]*>/)![0];
      // The browser lays out in 64ths of a pixel, so a width such as 12.9944 comes back as 12.984375.
      expect(drawing.width, drawing.src).toBeCloseTo(Number(root.match(/ width="([\d.]+)"/)![1]), 1);
      expect(drawing.height, drawing.src).toBeCloseTo(Number(root.match(/ height="([\d.]+)"/)![1]), 1);
    }

    // A tile is 36px for a channel and 16px for an agent, all of it room for the drawing: none is cut off.
    const tiles = await header(page)
      .locator('nav ul a > span:first-child')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.checkVisibility() && node.querySelector('img'))
          .map((node) => {
            const tile = node.getBoundingClientRect();
            const drawing = node.querySelector('img')!.getBoundingClientRect();

            return {
              name: node.parentElement!.textContent,
              room: node.clientWidth,
              inside:
                drawing.left >= tile.left - 0.05 &&
                drawing.top >= tile.top - 0.05 &&
                drawing.right <= tile.right + 0.05 &&
                drawing.bottom <= tile.bottom + 0.05,
              centered:
                Math.abs(drawing.left + drawing.right - tile.left - tile.right) < 0.1 &&
                Math.abs(drawing.top + drawing.bottom - tile.top - tile.bottom) < 0.1,
            };
          })
      );
    expect(tiles.map(({ room }) => room)).toEqual([34, 16, 34, 16, 16, 16, 34, 16, 16, 16, 16]);
    for (const tile of tiles) expect(tile, tile.name ?? '').toMatchObject({ inside: true, centered: true });
  });

  test('the footer keeps the package, the page for agents and the source in one row', async ({ page }) => {
    await page.goto('/use-cases');
    await page.evaluate(() => document.fonts.ready);
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    const navigation = footer.getByRole('navigation', { name: 'Footer navigation' });
    expect(
      await navigation.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
    ).toEqual(['https://www.npmjs.com/package/@agentinbox/cli', '/', SOURCE]);
    await expect(navigation.getByRole('link', { name: 'GitHub', exact: true })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'built by novu' })).toHaveAttribute('href', 'https://novu.co/');
    await expect(footer).toContainText('© 2026');
    await expect(footer.getByRole('link', { name: 'pricing' })).toHaveCount(0);

    // Figma `1632:32405`: a 50px row under the closing section's line, 9px inside its rails.
    const base = await box(footer);
    const closing = await box(page.locator('main > :last-child'));
    expect(base.height).toBe(50);
    expect(base.y - (closing.y + closing.height)).toBeCloseTo(1, 1);
    const logo = await box(footer.getByRole('link', { name: 'agentinbox' }));
    expect({ x: logo.x - base.x, y: logo.y - base.y }).toEqual({ x: 9, y: 8 });
    const npm = await box(navigation.getByRole('link', { name: 'npm' }));
    expect({ x: npm.x - base.x, y: npm.y - base.y, height: npm.height }).toEqual({ x: 163, y: 9, height: 32 });
    const built = await box(footer.getByRole('link', { name: 'built by novu' }));
    expect(built.x + built.width - base.x).toBeCloseTo(951, 0);
  });
});

test('with motion allowed the menu is there for the keyboard as soon as it opens, and fades out', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/use-cases');
  const panel = await panelOf(page, channelsButton(page));
  await expect(panel).toHaveCSS('visibility', 'hidden');
  await channelsButton(page).focus();
  // Enter and Tab with nothing between them: the first channel takes the focus, not the link after the menu.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(channelLink(page, 'Email')).toBeFocused();
  await expect(panel).toHaveCSS('opacity', '1');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCSS('visibility', 'hidden');
  await expect(panel).toHaveCSS('opacity', '0');
  await expect(channelsButton(page)).toBeFocused();
});

test.describe('touch at desktop width', () => {
  test.use({ hasTouch: true, viewport: { width: 1100, height: 800 } });

  test('a tap on a channel shows its agents, and the next tap opens it', async ({ page }) => {
    await page.goto('/use-cases');
    const panel = await panelOf(page, channelsButton(page));
    await channelsButton(page).tap();
    await expect(panel).toBeVisible();
    await expectAgents(page, 'Email');

    await channelLink(page, 'Telegram').tap();
    await expectAgents(page, 'Telegram');
    await expect(page).toHaveURL(/\/use-cases$/);
    await expect(panel).toBeVisible();
    await agents(page, 'Telegram').getByRole('link', { name: 'Hermes' }).tap();
    await expect(page).toHaveURL(/\/telegram\/hermes$/);

    await channelsButton(page).tap();
    await channelLink(page, 'Slack').tap();
    await expectAgents(page, 'Slack');
    await channelLink(page, 'Slack').tap();
    await expect(page).toHaveURL(/\/slack$/);

    // The channel whose agents are on show already opens at the first tap, and a tap elsewhere closes the menu.
    await channelsButton(page).tap();
    await page.touchscreen.tap(900, 600);
    await expect(channelsButton(page)).toHaveAttribute('aria-expanded', 'false');
    await channelsButton(page).tap();
    await channelLink(page, 'Email').tap();
    await expect(page).toHaveURL(/\/email$/);
  });
});

for (const width of [1023, 768, 390, 320]) {
  test(`below the desktop row the menu holds every destination at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/use-cases');
    await expect(channelsButton(page)).toBeHidden();
    const panel = await panelOf(page, menuButton(page));
    await expect(panel).toBeHidden();
    await menuButton(page).click();
    await expect(panel).toBeVisible();

    // The row's three items, then its buttons in the row's order.
    const navigation = header(page).getByRole('navigation', { name: 'Header navigation' });
    const names = () =>
      navigation
        .locator('a, button')
        .evaluateAll((controls) =>
          controls.filter((control) => control.checkVisibility()).map((control) => control.textContent || 'GitHub')
        );
    expect(await names()).toEqual(['channels', 'use cases', 'pricing', 'GitHub', 'dashboard', 'book a demo']);
    await navigation.getByRole('button', { name: 'channels', exact: true }).click();
    await expect(navigation.getByRole('link', { name: /Its own/ })).toHaveCount(3);
    await expect(navigation.getByRole('link')).toHaveCount(16);
    for (const link of await navigation.getByRole('link').all()) await expect(link).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Nothing in the panel is cut off at its edges.
    const bounds = await box(panel);
    for (const link of await navigation.getByRole('link').all()) {
      const place = await box(link);
      expect(place.x).toBeGreaterThanOrEqual(bounds.x);
      expect(place.x + place.width).toBeLessThanOrEqual(bounds.x + bounds.width + 0.5);
    }
    await expect(navigation.getByRole('link', { name: 'use cases', exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    );

    await navigation.getByRole('link', { name: 'pricing', exact: true }).click();
    await expect(page).toHaveURL(/\/pricing$/);
    // The header is a new one on the new page: its button says whether its menu is open.
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
  });
}

test('the small-screen menu hands the focus back on Escape and closes behind a focus that moves on', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/telegram');
  const panel = await panelOf(page, menuButton(page));
  await menuButton(page).click();
  await expect(panel).toBeVisible();
  const navigation = header(page).getByRole('navigation', { name: 'Header navigation' });
  const channels = navigation.getByRole('button', { name: 'channels', exact: true });

  // The list comes first: channels opens from the keyboard and its links come next.
  await page.keyboard.press('Tab');
  await expect(channels).toBeFocused();
  await expect(channels).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(channels).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: /^Telegram/ })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: /^Email/ })).not.toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Tab');
  await expect(navigation.getByRole('link', { name: /^Email/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(agents(page, 'Email').getByRole('link', { name: 'OpenClaw' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(menuButton(page)).toBeFocused();

  // Opened again, channels is closed again: six stops, and the seventh is in the page, which the panel would cover.
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await expect(channels).toHaveAttribute('aria-expanded', 'false');
  for (let stop = 0; stop < 6; stop++) await page.keyboard.press('Tab');
  await expect(navigation.getByRole('link', { name: 'book a demo', exact: true })).toBeFocused();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(panel).toBeHidden();
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true);

  // And at its front: back from the button to the logo.
  await menuButton(page).click();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(header(page).getByRole('link', { name: 'agentinbox' })).toBeFocused();
  await expect(panel).toBeHidden();
});

test("a phone doesn't fetch the drawings only the desktop row shows", async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', (request) => fetched.push(new URL(request.url()).pathname));
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/use-cases');
  // Long enough for a drawing that was going to load with the page to have asked for its file.
  await page.waitForLoadState('load');
  await page.waitForTimeout(500);
  await menuButton(page).click();
  // Its own menu's drawings are there when it opens.
  expect(
    await header(page)
      .locator('img')
      .evaluateAll((images) =>
        (images as HTMLImageElement[])
          .filter((image) => image.checkVisibility())
          .every((image) => image.complete && image.naturalWidth > 0)
      )
  ).toBe(true);
  const drawings = () => [...new Set(fetched.filter((path) => path.startsWith('/images/navigation/')))].sort();
  expect(drawings()).toEqual([
    '/images/navigation/channel-email.svg',
    '/images/navigation/channel-slack.svg',
    '/images/navigation/channel-telegram.svg',
    '/images/navigation/chevron-down-16.svg',
    '/images/navigation/github-44.svg',
  ]);
  // The agents' logos, and the rows' arrow, are fetched when channels is opened.
  await header(page).getByRole('button', { name: 'channels', exact: true }).click();
  await expect
    .poll(drawings)
    .toEqual([
      '/images/navigation/agent-claude-code.svg',
      '/images/navigation/agent-codex.svg',
      '/images/navigation/agent-cursor.svg',
      '/images/navigation/agent-hermes.svg',
      '/images/navigation/agent-openclaw.svg',
      '/images/navigation/arrow-right.svg',
      '/images/navigation/channel-email.svg',
      '/images/navigation/channel-slack.svg',
      '/images/navigation/channel-telegram.svg',
      '/images/navigation/chevron-down-16.svg',
      '/images/navigation/github-44.svg',
    ]);
});

test('the desktop row replaces the menu from 1024px', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/telegram/openclaw');
  await expect(menuButton(page)).toBeHidden();
  await expect(channelsButton(page)).toBeVisible();
  await channelsButton(page).click();
  const panel = await panelOf(page, channelsButton(page));
  const place = await box(panel);
  expect(place.x).toBeGreaterThanOrEqual(0);
  expect(place.x + place.width).toBeLessThanOrEqual(1024);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const actions = await box(header(page).getByRole('link', { name: 'book a demo', exact: true }));
  const rail = await box(header(page));
  expect(actions.x + actions.width).toBeLessThanOrEqual(rail.x + rail.width - 8 + 0.5);
});

test('a short window scrolls the small-screen menu instead of cutting it off', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 360 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/use-cases');
  await menuButton(page).click();
  const panel = await panelOf(page, menuButton(page));
  const place = await box(panel);
  expect(place.y + place.height).toBe(360);
  await header(page).getByRole('button', { name: 'channels', exact: true }).click();
  expect(await panel.locator('nav').evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  const demo = header(page).getByRole('navigation').getByRole('link', { name: 'book a demo', exact: true });
  await expect(demo).not.toBeInViewport();
  await demo.scrollIntoViewIfNeeded();
  await expect(demo).toBeInViewport();
});

test('the small-screen menu fills the window: the list, channels opening in place, and the buttons at its foot', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/use-cases');
  await page.evaluate(() => scrollTo({ top: 600, behavior: 'instant' }));
  await menuButton(page).click();
  const panel = await panelOf(page, menuButton(page));
  const navigation = header(page).getByRole('navigation', { name: 'Header navigation' });
  // From under the header's line to the bottom of the window, as wide as the column.
  expect(await box(panel)).toEqual({ x: 10, y: 51, width: 370, height: 793 });
  // Figma `1693:5333`: the buttons are one row 12px from its foot, in the header's order.
  expect(await box(navigation.getByRole('link', { name: 'GitHub', exact: true }))).toEqual({
    x: 20,
    y: 788,
    width: 44,
    height: 44,
  });
  const dashboard = await box(navigation.getByRole('link', { name: 'dashboard', exact: true }));
  const demo = await box(navigation.getByRole('link', { name: 'book a demo', exact: true }));
  expect(dashboard).toMatchObject({ x: 72, y: 788, height: 44 });
  expect(demo).toMatchObject({ y: 788, height: 44 });
  expect(demo.x).toBeCloseTo(dashboard.x + dashboard.width + 8, 1);
  expect(demo.x + demo.width).toBeCloseTo(370, 1);
  expect(demo.width).toBeCloseTo(dashboard.width, 1);
  // The page behind it stays where it was.
  await page.mouse.move(195, 500);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(200);
  expect(await scrolled(page)).toBe(600);

  // One list in one size, from right under the header's line: channels, use cases, pricing.
  const channels = navigation.getByRole('button', { name: 'channels', exact: true });
  expect((await box(channels)).y).toBe(51);
  // Each row is 56px with its line, so the next starts 56px on.
  expect((await box(navigation.getByRole('link', { name: 'use cases', exact: true }))).y).toBe(107);
  expect((await box(navigation.getByRole('link', { name: 'pricing', exact: true }))).y).toBe(163);
  for (const row of [
    channels,
    navigation.getByRole('link', { name: 'use cases', exact: true }),
    navigation.getByRole('link', { name: 'pricing', exact: true }),
  ]) {
    expect(await box(row)).toMatchObject({ x: 20, width: 350, height: 56 });
    expect((await box(row)).y).toBeLessThan(200);
    await expect(row).toHaveCSS('font-size', '20px');
  }
  await expect(channels).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation.getByRole('link', { name: /Its own/ })).toHaveCount(0);

  // Channels opens in place: each channel a link to its page, with its agents under it.
  await channels.click();
  await expect(channels).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: /Its own/ })).toHaveText([
    'EmailIts own email address',
    'TelegramIts own Telegram bot',
    'SlackIts own Slack app',
  ]);
  await expect(agents(page, 'Email').getByRole('link')).toHaveText(['OpenClaw']);
  await expect(agents(page, 'Telegram').getByRole('link')).toHaveText(['OpenClaw', 'Claude Code', 'Hermes']);
  await expect(agents(page, 'Slack').getByRole('link')).toHaveText(['Claude Code', 'OpenClaw', 'Codex', 'Cursor']);
  // Figma `1693:5378`: 12px in, a channel's row with its arrow at the far end, then its agents one to a line
  // under their label, each a 34px row with an 18px tile; 32px between one channel and the next.
  const email = await box(navigation.getByRole('link', { name: /^Email Its own/ }));
  expect(email).toEqual({ x: 32, y: 111, width: 326, height: 39 });
  const arrow = await box(
    navigation
      .getByRole('link', { name: /^Email Its own/ })
      .locator('img')
      .last()
  );
  expect(arrow).toMatchObject({ x: 342, width: 16, height: 16 });
  await expect(navigation.getByText('Connect an agent', { exact: true })).toHaveCount(3);
  for (const agent of await navigation
    .getByRole('list', { name: /^Connect an agent/ })
    .getByRole('link')
    .all()) {
    expect(await box(agent)).toMatchObject({ x: 32, width: 326, height: 34 });
    expect(await box(agent.locator('span').first())).toMatchObject({ x: 32, width: 18, height: 18 });
  }
  const telegram = await box(navigation.getByRole('link', { name: /^Telegram Its own/ }));
  const lastOfEmail = await box(agents(page, 'Email').getByRole('link').last());
  expect(telegram.y - (lastOfEmail.y + lastOfEmail.height)).toBeCloseTo(32, 0);
  await expect(page).toHaveURL(/\/use-cases$/);

  // A channel is one tap to its page.
  await navigation.getByRole('link', { name: /^Telegram Its own/ }).click();
  await expect(page).toHaveURL(/\/telegram$/);
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
  // The page scrolls again once the menu is gone.
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');

  // And so is an agent. A menu opened again starts with channels closed.
  await menuButton(page).click();
  await expect(channels).toHaveAttribute('aria-expanded', 'false');
  await channels.click();
  await agents(page, 'Slack').getByRole('link', { name: 'Codex' }).click();
  await expect(page).toHaveURL(/\/slack\/codex$/);
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
});

test('a window grown wide enough for the row closes the small-screen menu and frees the page', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/use-cases');
  await menuButton(page).click();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(channelsButton(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
});

for (const [width, rows] of [
  [360, 3],
  [480, 2],
  [640, 1],
  [767, 1],
] as const) {
  test(`the footer is ${rows === 1 ? 'one row' : `${rows} rows`} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/use-cases');
    await page.evaluate(() => document.fonts.ready);
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    // The logo, the three buttons and Novu's link: how many different heights their middles are at.
    const middles = await footer
      .getByRole('link')
      .evaluateAll((links) =>
        links.map((link) => Math.round(link.getBoundingClientRect().top + link.getBoundingClientRect().height / 2))
      );
    expect(middles).toHaveLength(5);
    expect(new Set(middles).size).toBe(rows);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const base = await box(footer);
    const built = await box(footer.getByRole('link', { name: 'built by novu' }));
    // In one row the copyright is at the far end; under the row it starts where the logo does.
    if (rows === 1) expect(built.x + built.width).toBeCloseTo(base.x + base.width - 10, 0);
    else expect((await box(footer.locator('p'))).x).toBeCloseTo(base.x + 10, 0);
  });
}
