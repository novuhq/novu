import { expect, test } from '@playwright/test';

test('tab groups are labelled and headings preserve spaces in Chromium', async ({ page }) => {
  await page.goto('/sapien');
  const client = await page.context().newCDPSession(page);
  const { nodes } = await client.send('Accessibility.getFullAXTree');
  // The flat tree lists nodes in creation order, not page order.
  const tablists = nodes
    .filter((node) => node.role?.value === 'tablist')
    .map((node) => node.name?.value)
    .sort();
  expect(tablists).toEqual(['Example agents', 'Integrations', 'Message types']);
  expect(nodes.filter((node) => node.role?.value === 'tab')).toHaveLength(15);
  const headings = nodes.filter((node) => node.role?.value === 'heading').map((node) => node.name?.value);
  expect(headings).toContain('One inbox. Every agent you run');
  expect(headings).toContain('The agent communication building blocks');
  expect(headings).toContain('Works everywhere your agents are');
  expect(headings).toContain('Give your agent an Inbox. Today');
});

test('customer logos are announced once despite the looping marquee', async ({ page }) => {
  await page.goto('/sapien');
  const logos = page.getByRole('region', { name: 'Customer logos' });
  await expect(logos.getByRole('img', { name: 'MongoDB' })).toHaveCount(1);
  await expect(logos.getByRole('listitem')).toHaveCount(28);
});
