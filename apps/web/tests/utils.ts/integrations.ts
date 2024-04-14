import { expect, Locator, Page } from '@playwright/test';

import { getByTestId } from './browser';

export const navigateToGetStarted = async (page: Page, card = 'channel-card-email') => {
  await page.goto('/get-started');
  await expect(page).toHaveURL(/\/get-started/);

  const cardComponent = getByTestId(page, card);
  const button = cardComponent.locator('button');
  await expect(button).toContainText('Change Provider');
  await button.click();

  const integrationsModal = getByTestId(page, 'integrations-list-modal');
  await expect(integrationsModal).toBeVisible();
  await expect(integrationsModal).toContainText('Integrations Store');
};

export const checkTableLoading = async (page: Page | Locator) => {
  const nameCellLoadingElements = getByTestId(page, 'integration-name-cell-loading');
  await expect(nameCellLoadingElements).toHaveCount(10);
  await expect(nameCellLoadingElements.first()).toBeVisible();

  const providerCellLoadingElements = getByTestId(page, 'integration-provider-cell-loading');
  await expect(providerCellLoadingElements).toHaveCount(10);
  await expect(providerCellLoadingElements.first()).toBeVisible();

  const channelCellLoadingElements = getByTestId(page, 'integration-channel-cell-loading');
  await expect(channelCellLoadingElements).toHaveCount(10);
  await expect(channelCellLoadingElements.first()).toBeVisible();

  const envCellLoadingElements = getByTestId(page, 'integration-environment-cell-loading');
  await expect(envCellLoadingElements).toHaveCount(10);
  await expect(envCellLoadingElements.first()).toBeVisible();

  const statusCellLoadingElements = getByTestId(page, 'integration-status-cell-loading');
  await expect(statusCellLoadingElements).toHaveCount(10);
  await expect(statusCellLoadingElements.first()).toBeVisible();
};

export const checkTableRow = async (
  page: Page | Locator,
  {
    name,
    isFree,
    provider,
    channel,
    environment,
    status,
  }: {
    name: string;
    isFree?: boolean;
    provider: string;
    channel: string;
    environment?: string;
    status: string;
  }
) => {
  const integrationsTable = getByTestId(page, 'integrations-list-table');
  const nthRow = integrationsTable.locator('tbody tr', { hasText: new RegExp(`${name}.*${environment ?? ''}`) });
  const nameCell = getByTestId(nthRow, 'integration-name-cell', { hasText: name });
  await expect(nameCell).toBeVisible();

  if (isFree) {
    await expect(nameCell).toContainText('Test Provider');
  }

  const providerCell = getByTestId(nthRow, 'integration-provider-cell', { hasText: provider });
  await expect(providerCell).toBeVisible();

  const channelCell = getByTestId(nthRow, 'integration-channel-cell', { hasText: channel });
  await expect(channelCell).toBeVisible();

  if (environment) {
    const environmentCell = getByTestId(nthRow, 'integration-environment-cell', { hasText: environment });
    await expect(environmentCell).toBeVisible();
  }

  const statusCell = getByTestId(nthRow, 'integration-status-cell', { hasText: status });
  await expect(statusCell).toBeVisible();
};

export const clickOnListRow = async (page: Page | Locator, name: string | RegExp) => {
  const integrationsTable = getByTestId(page, 'integrations-list-table');
  const row = integrationsTable.locator('tr', { hasText: name }).first();
  await expect(row).toBeVisible();
  await row.click();
};

export async function interceptIntegrationsRequest({
  page,
  modifyBody,
}: {
  page: Page;
  modifyBody?: (body: any) => any;
}) {
  return page.route('**/v1/integrations', async (route) => {
    const response = await page.request.fetch(route.request());
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const body = await response.json();

    await route.fulfill({
      response,
      body: JSON.stringify(modifyBody ? modifyBody(body) : body),
    });
  });
}
