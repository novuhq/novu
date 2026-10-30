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
  await expect(blocks.getByRole('tabpanel')).toContainText('Which environment should I deploy to?');
  await blocks.getByRole('tab', { name: 'Choose', exact: true }).click();
  await expect(blocks.getByRole('tabpanel')).toContainText('Which release strategy should I use?');
  await blocks.getByRole('tab', { name: 'Tell', exact: true }).click();
  await expect(blocks.getByRole('tabpanel')).toContainText('The staging checks passed.');
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

test('the example agents stack as a vertical list on mobile and the message types fit in one row', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sapien');
  const inbox = page.locator('#inbox');
  await expect(inbox.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  const tabs = await inbox.getByRole('tab').all();
  const boxes = await Promise.all(tabs.map(async (tab) => (await tab.boundingBox())!));
  for (const [index, box] of boxes.entries()) {
    expect(box.x + box.width).toBeLessThanOrEqual(361);
    if (index > 0) expect(box.y).toBeGreaterThan(boxes[index - 1].y);
  }
  await inbox.getByRole('tab', { name: 'Ops Agent', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(inbox.getByRole('tab', { name: 'Sales Agent', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(inbox.getByRole('tabpanel')).toContainText('sales-agent@agentinbox.md');

  for (const tab of await page.locator('#building-blocks [role="tab"]').all())
    await expect(tab).toHaveCSS('white-space', 'nowrap');
  const strip = page.locator('#building-blocks [role="tablist"]').locator('xpath=..');
  expect(await strip.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test('hovering the inbox example reveals the JSON the agent reads', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sapien');
  const flow = page.locator('#inbox').getByRole('tabpanel');
  const stage = flow.locator('[data-open]');
  await stage.scrollIntoViewIfNeeded();
  await expect(flow.locator('[data-face="seen"]')).toContainText('Approved. Take the $240 refund');
  await expect(flow.locator('[data-face="reading"]')).toContainText('conv_8831');
  await expect(stage).toHaveAttribute('data-open', 'false');
  await stage.hover();
  await expect(stage).toHaveAttribute('data-open', 'true');
  await page.mouse.move(0, 0);
  await expect(stage).toHaveAttribute('data-open', 'false');
  await expect(flow.getByRole('button', { name: 'Show agent view' })).toHaveCount(0);
  await stage.hover();
  expect(await flow.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0);
});

test('the use cases carousel moves with its buttons and the arrow keys', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sapien');
  const carousel = page.locator('#use-cases').locator('[aria-roledescription="carousel"]');
  await expect(carousel).toHaveAttribute('aria-label', 'Use cases');
  const slides = carousel.locator('[aria-roledescription="slide"]');
  await expect(slides).toHaveCount(5);
  await expect(slides.first()).toHaveAttribute('aria-label', '1 of 5');
  await expect(slides.nth(2)).toContainText('Browser agents');
  const previous = carousel.getByRole('button', { name: 'Previous use case' });
  const next = carousel.getByRole('button', { name: 'Next use case' });
  const track = carousel.locator('ul').first();
  const scrollLeft = () => track.evaluate((node) => node.scrollLeft);

  await carousel.scrollIntoViewIfNeeded();
  await expect(previous).toBeDisabled();
  await next.click();
  await expect.poll(scrollLeft).toBeGreaterThan(0);
  await expect(previous).toBeEnabled();
  await previous.click();
  await expect.poll(scrollLeft).toBe(0);

  await track.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(scrollLeft).toBeGreaterThan(0);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(scrollLeft).toBe(0);
  for (let press = 0; press < 5; press++) await page.keyboard.press('ArrowRight');
  await expect(next).toBeDisabled();
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
    const claude = section.getByRole('tab', { name: 'Skills', exact: true });
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
  await expect(page.locator('html')).toHaveAttribute('data-copied-text', 'npx @agentinbox/cli setup');
  await expect(section.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  await section.getByRole('tab', { name: 'Cursor', exact: true }).click();
  await section.getByRole('button', { name: 'Copy Config' }).click();
  const copied = await page.evaluate(() => document.documentElement.dataset.copiedText ?? '');
  expect(JSON.parse(copied)).toHaveProperty('mcpServers.AgentInbox.url', 'https://mcp.agentinbox.md');
  await section.getByRole('tab', { name: 'Hermes', exact: true }).click();
  await section.getByRole('button', { name: 'Copy Commands' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-copied-text',
    ['npx skills add agentinboxhq/skills \\', '    -g --agent hermes-agent -y'].join('\n')
  );
  await section.getByRole('tab', { name: 'MCP', exact: true }).click();
  await section.getByRole('button', { name: 'Copy URL' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-copied-text', 'https://mcp.agentinbox.md');
});

test('FAQ starts with the first answer open and toggles from the keyboard', async ({ page }) => {
  await page.goto('/sapien');
  const faq = page.locator('#faq');
  const first = faq.locator('details').first();
  const second = faq.locator('details').nth(1);
  const last = faq.locator('details').last();
  await expect(first).toHaveAttribute('open');
  await expect(first).toContainText('its own email address');
  await expect(second).not.toHaveAttribute('open');
  await second.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('open');
  await last.locator('summary').click();
  await expect(last).toHaveAttribute('open');
  await expect(first).toHaveAttribute('open');
  await expect(last).toContainText('contacts only');
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(first).not.toHaveAttribute('open');
});

test('closing prompt copy is independent of the setup command', async ({ page }) => {
  await stubClipboard(page);
  await page.goto('/sapien');
  const closing = page.locator('#get-started');
  await closing.getByRole('button', { name: 'Copy Prompt' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-copied-text',
    'Set up an agentinbox inbox for yourself using https://www.agentinbox.md/agents.md'
  );
  await expect(closing.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  const command = page.getByRole('group', { name: 'Closing setup command' });
  await expect(command.getByRole('status')).toHaveText('');
});
