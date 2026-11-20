import { expect, test } from '@playwright/test';

test('use-case filters update the listing in place and reset to all examples', async ({ page }) => {
  await page.goto('/use-cases');
  const initialUrl = page.url();
  const filters = page.getByRole('group', { name: 'Filter use cases' });
  const approvals = filters.getByRole('button', { name: 'Approvals' });
  const teamRequests = filters.getByRole('button', { name: 'Team requests' });
  const results = page.getByRole('region', { name: 'Use case results' });

  await expect(filters.getByRole('button')).toHaveCount(8);
  await expect(filters.getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(results.getByRole('article')).toHaveCount(8);
  await approvals.scrollIntoViewIfNeeded();
  const scrollPosition = await page.evaluate(() => window.scrollY);
  await approvals.click();

  await expect(results.getByRole('article')).toHaveCount(1);
  await expect(results.getByRole('article')).toHaveAttribute('id', 'approvals');
  await expect(results.getByRole('heading', { name: 'Ask before acting' })).toBeVisible();
  await expect(approvals).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(initialUrl);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollPosition);

  await teamRequests.focus();
  await page.keyboard.press('Enter');
  await expect(results.getByRole('article')).toHaveCount(1);
  await expect(results.getByRole('article')).toHaveAttribute('id', 'team-requests');
  await expect(results.getByRole('heading', { name: 'Work with people' })).toBeVisible();
  await expect(results.getByRole('heading', { name: 'Ask before acting' })).toHaveCount(0);
  await expect(teamRequests).toBeFocused();
  await expect(teamRequests).toHaveAttribute('aria-pressed', 'true');
  await expect(approvals).toHaveAttribute('aria-pressed', 'false');
  await expect(page).toHaveURL(initialUrl);

  await page.keyboard.press('Space');
  await expect(teamRequests).toBeFocused();
  await expect(filters.getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(results.getByRole('article')).toHaveCount(8);
  await expect(page).toHaveURL(initialUrl);
});
