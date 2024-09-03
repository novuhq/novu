import { expect, Locator, Page } from '@playwright/test';

export const navigateToGetStarted = async (page: Page, card = 'channel-card-email') => {
  await page.goto('/get-started');
  await expect(page).toHaveURL(/\/get-started/);

  const cardComponent = page.getByTestId(card);
  const button = cardComponent.locator('button');
  await expect(button).toContainText('Change Provider');
  await button.click();

  const integrationsModal = page.getByTestId('integrations-list-modal');
  await expect(integrationsModal).toBeVisible();
  await expect(integrationsModal.getByRole('heading')).toContainText('Integration Store');
};

export const checkTableLoading = async (page: Page | Locator) => {
  const nameCellLoadingElements = page.getByTestId('integration-name-cell-loading');
  await expect(nameCellLoadingElements).toHaveCount(10);
  await expect(nameCellLoadingElements.first()).toBeVisible();

  const providerCellLoadingElements = page.getByTestId('integration-provider-cell-loading');
  await expect(providerCellLoadingElements).toHaveCount(10);
  await expect(providerCellLoadingElements.first()).toBeVisible();

  const channelCellLoadingElements = page.getByTestId('integration-channel-cell-loading');
  await expect(channelCellLoadingElements).toHaveCount(10);
  await expect(channelCellLoadingElements.first()).toBeVisible();

  const envCellLoadingElements = page.getByTestId('integration-environment-cell-loading');
  await expect(envCellLoadingElements).toHaveCount(10);
  await expect(envCellLoadingElements.first()).toBeVisible();

  const statusCellLoadingElements = page.getByTestId('integration-status-cell-loading');
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
  const integrationsTable = page.getByTestId('integrations-list-table');
  const nthRow = integrationsTable.locator('tbody tr', { hasText: new RegExp(`^${name}.*${environment ?? ''}`) });
  const nameCell = nthRow.getByTestId('integration-name-cell').getByText(name, { exact: true });
  await expect(nthRow).toBeVisible();
  await expect(nameCell).toBeVisible();

  if (isFree) {
    await expect(nameCell).toContainText('Test Provider');
  }

  const providerCell = nthRow.getByTestId('integration-provider-cell').getByText(provider);
  await expect(providerCell).toBeVisible();

  const channelCell = nthRow.getByTestId('integration-channel-cell').getByText(channel);
  await expect(channelCell).toBeVisible();

  if (environment) {
    const environmentCell = nthRow.getByTestId('integration-environment-cell').getByText(environment);
    await expect(environmentCell).toBeVisible();
  }

  const statusCell = nthRow.getByTestId('integration-status-cell').getByText(status);
  await expect(statusCell).toBeVisible();
};

export const clickOnListRow = async (page: Page | Locator, name: string | RegExp) => {
  const integrationsTable = page.getByTestId('integrations-list-table');
  const row = integrationsTable.locator('tr').getByText(name).first();
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
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    const body = await response.json();

    await route.fulfill({
      response,
      body: JSON.stringify(modifyBody ? modifyBody(body) : body),
    });
  });
}
