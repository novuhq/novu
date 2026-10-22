import { expect, type Page, test } from '@playwright/test';

async function stubClipboard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copiedText = text;
        },
      },
    });
  });
}

test('each tab group changes only its own panel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sapien');
  const inbox = page.locator('#inbox');
  const blocks = page.locator('#building-blocks');
  await expect(inbox.getByRole('tab', { name: 'Ops Agent', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(blocks.getByRole('tab', { name: 'Approve', exact: true })).toHaveAttribute('aria-selected', 'true');

  await inbox.getByRole('tab', { name: 'Personal Assistant' }).click();
  await expect(inbox.getByRole('tabpanel')).toContainText('assistant@agentinbox.md');
  await blocks.getByRole('tab', { name: 'Ask', exact: true }).click();
  await expect(blocks.getByRole('tabpanel')).toContainText('Where should I ship the order?');
  await blocks.getByRole('tab', { name: 'Choose', exact: true }).click();
  await expect(blocks.getByRole('tabpanel')).toContainText('How should I resolve Acme?');
  await blocks.getByRole('tab', { name: 'Tell', exact: true }).click();
  await expect(blocks.getByRole('tabpanel')).toContainText('Refund sent to Acme Corp');
  await expect(inbox.getByRole('tab', { name: 'Personal Assistant' })).toHaveAttribute('aria-selected', 'true');
});

for (const width of [640, 360]) {
  test(`tab strips keep every tab reachable with enlarged text spacing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/sapien');
    // WCAG 1.4.12 text spacing.
    await page.addStyleTag({
      content:
        '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
    });
    for (const section of ['inbox', 'building-blocks']) {
      const strip = page.locator(`#${section} [role="tablist"]`).locator('xpath=..');
      await strip.scrollIntoViewIfNeeded();
      const box = (await strip.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      const last = page.locator(`#${section} [role="tab"]`).last();
      await last.evaluate((node) => node.scrollIntoView({ block: 'nearest', inline: 'end' }));
      const tab = (await last.boundingBox())!;
      expect(tab.x + tab.width).toBeLessThanOrEqual(box.x + box.width + 1);
    }
  });
}

test('mobile tab strips scroll instead of wrapping and keep the active tab in view', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sapien');
  const strip = (section: string) => page.locator(`#${section} [role="tablist"]`).locator('xpath=..');
  const inView = async (section: string, name: string) => {
    const box = (await strip(section).boundingBox())!;
    const tab = (await page.locator(`#${section}`).getByRole('tab', { name, exact: true }).boundingBox())!;
    return tab.x >= box.x - 1 && tab.x + tab.width <= box.x + box.width + 1;
  };
  for (const tab of await page.locator('#inbox [role="tab"], #building-blocks [role="tab"]').all())
    await expect(tab).toHaveCSS('white-space', 'nowrap');

  // The agent names don't fit at 360px: the strip scrolls, centred on the active tab.
  await strip('inbox').scrollIntoViewIfNeeded();
  expect(await strip('inbox').evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  expect(await inView('inbox', 'Ops Agent')).toBe(true);
  await page.locator('#inbox').getByRole('tab', { name: 'Ops Agent', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => inView('inbox', 'Sales Agent')).toBe(true);

  // The message types are short enough to share the width without scrolling.
  expect(await strip('building-blocks').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});

for (const width of [1440, 390]) {
  test(`integration list keyboard selection at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await page.goto('/sapien');
    const section = page.locator('#integrations');
    await expect(section.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    const cli = section.getByRole('tab', { name: 'CLI', exact: true });
    await cli.focus();
    await page.keyboard.press('ArrowDown');
    const claude = section.getByRole('tab', { name: 'Claude', exact: true });
    await expect(claude).toBeFocused();
    await expect(claude).toHaveAttribute('aria-selected', 'true');
    await expect(claude).toHaveCSS('transition-duration', '0s');
    await page.clock.fastForward(60000);
    await expect(claude).toHaveAttribute('aria-selected', 'true');
  });
}

test('copy commands copies the selected snippet without prompts', async ({ page }) => {
  await stubClipboard(page);
  await page.goto('/sapien');
  const section = page.locator('#integrations');
  await section.getByRole('button', { name: 'Copy Commands' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-copied-text',
    [
      'npx @agentinbox/cli setup',
      '',
      'npx @agentinbox/cli channel add telegram',
      'npx @agentinbox/cli inbox list --filter unread',
      'npx @agentinbox/cli inbox send approve \\',
      "    'Refund $240?' --to maya",
    ].join('\n')
  );
  await expect(section.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  await section.getByRole('tab', { name: 'Cursor', exact: true }).click();
  await section.getByRole('button', { name: 'Copy Config' }).click();
  const copied = await page.evaluate(() => document.documentElement.dataset.copiedText ?? '');
  expect(JSON.parse(copied)).toHaveProperty('mcpServers.inbox.url', 'https://mcp.agentinbox.md');
});

test('FAQ starts with the first answer open and toggles from the keyboard', async ({ page }) => {
  await page.goto('/sapien');
  const faq = page.locator('#faq');
  const first = faq.locator('details').first();
  const second = faq.locator('details').nth(1);
  const last = faq.locator('details').last();
  await expect(first).toHaveAttribute('open');
  await expect(first).toContainText('its own inbox');
  await expect(second).not.toHaveAttribute('open');
  await second.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('open');
  await last.locator('summary').click();
  await expect(last).toHaveAttribute('open');
  await expect(first).toHaveAttribute('open');
  await expect(last).toContainText('100 conversations a month');
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(first).not.toHaveAttribute('open');
});

test('closing prompt copy is independent of the setup command', async ({ page }) => {
  await stubClipboard(page);
  await page.goto('/sapien');
  const closing = page.locator('#get-started');
  await closing.getByRole('button', { name: 'Copy Prompt' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-copied-text', /npx @agentinbox\/cli setup/);
  await expect(closing.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  const command = page.getByRole('group', { name: 'Closing setup command' });
  await expect(command.getByRole('status')).toHaveText('');
});
