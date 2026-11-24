import { expect, test } from '@playwright/test';

test('hero artwork fills its cells at tablet widths', async ({ page }) => {
  await page.setViewportSize({ width: 959, height: 900 });
  await page.goto('/use-cases');
  const dither = page.locator('#hero [data-hero-dither]');
  const pulse = page.locator('#hero img[src$="/hero-pulse.svg"]');

  await expect(dither).toBeVisible();
  const tile = await dither.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    stripWidth: Number.parseFloat(getComputedStyle(element, '::before').height),
  }));
  expect(tile.stripWidth).toBeGreaterThanOrEqual(tile.width);

  const pulseBounds = await pulse.evaluate((element) => {
    const art = element.getBoundingClientRect();
    const cell = element.closest('.overflow-hidden')?.getBoundingClientRect();

    return { left: art.left, right: art.right, cellLeft: cell?.left ?? 0, cellRight: cell?.right ?? 0 };
  });
  expect(pulseBounds.left).toBeLessThanOrEqual(pulseBounds.cellLeft);
  expect(pulseBounds.right).toBeGreaterThanOrEqual(pulseBounds.cellRight);
});

test('the narrow setup walkthrough fills the column and shows the revised states', async ({ page }) => {
  await page.setViewportSize({ width: 703, height: 1026 });
  await page.goto('/use-cases');
  const setup = page.locator('#setup');
  const tabs = setup.getByRole('tablist');
  const panel = setup.getByRole('tabpanel');
  const listWidth = (await tabs.boundingBox())?.width ?? 0;
  expect(listWidth).toBeGreaterThan(600);

  for (const name of [/Connect your agent/, /Add your channels/, /Ask and hear back/]) {
    await tabs.getByRole('tab', { name }).click();
    await expect(panel).toBeVisible();
    expect(Math.abs(((await panel.locator('..').boundingBox())?.width ?? 0) - listWidth)).toBeLessThan(1);
  }

  await expect(panel.getByText('approve', { exact: true }).first()).toHaveCSS('color', 'rgb(255, 92, 48)');
  await expect(panel.getByText('Issue a $240 refund to Acme Corp?')).toBeVisible();

  await tabs.getByRole('tab', { name: /Add your channels/ }).click();
  await expect(panel.locator('img[src$="/step-add.svg"]')).toHaveCount(3);
  await expect(panel.getByRole('link', { name: /Email/ })).toHaveAttribute('href', '/email');
  await expect(panel.getByRole('link', { name: 'Invite your team' })).toHaveAttribute('href', '/contacts');
});

test('team rows stack on phones and use-case badges use the revised size', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/use-cases');
  const table = page.getByRole('table', { name: 'How teams use Agent Inbox' });
  await expect(table.getByRole('row')).toHaveCount(6);
  const row = table.getByRole('row', { name: /Engineering/ });
  const header = row.getByRole('rowheader');
  const cell = row.getByRole('cell');
  await expect(header).toBeVisible();
  const mobileHeader = await header.boundingBox();
  const mobileCell = await cell.boundingBox();
  expect(mobileCell?.x).toBe(mobileHeader?.x);
  expect(mobileCell?.y ?? 0).toBeGreaterThan((mobileHeader?.y ?? 0) + 20);

  const approvals = page.locator('#approvals');
  const stack = approvals.getByRole('listitem').filter({ hasText: /^Any agent$/ });
  await expect(stack.locator('img')).toHaveCount(4);
  expect(
    await stack
      .locator('img')
      .first()
      .evaluate((mark) => mark.parentElement?.getBoundingClientRect().width)
  ).toBe(18);
  const codingAgent = page
    .locator('#coding-agents')
    .getByRole('listitem')
    .filter({ hasText: /^Codex$/ });
  await expect(codingAgent.locator('img')).toHaveCSS('width', '18px');

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopHeader = await header.boundingBox();
  const desktopCell = await cell.boundingBox();
  expect(desktopCell?.x ?? 0).toBeGreaterThan(desktopHeader?.x ?? 0);
});
