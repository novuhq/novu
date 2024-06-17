import { test } from './utils/baseTest';
import { TenantsPage } from './page-models/tenantsPage';
import { assertPageShowsMessage, initializeSession } from './utils/browser';

test.beforeEach(async ({ page }) => {
  await initializeSession(page, { noTemplates: true });
});

test('should display empty tenants info', async ({ page }) => {
  await TenantsPage.goTo(page);
  await assertPageShowsMessage(page, 'Add the first tenant for the');
});
test('should add new tenant', async ({ page }) => {
  const tenantsPage = await TenantsPage.goTo(page);
  const newTenantName = await tenantsPage.createNewTenant();
  await assertPageShowsMessage(page, newTenantName);
});

test('should update existing tenant name', async ({ page }) => {
  let tenantsPage = await TenantsPage.goTo(page);
  const newTenantName = await tenantsPage.createNewTenant();
  await tenantsPage.clickElementByText(newTenantName);
  const newName = 'Some_updated_name';
  await page.getByTestId('tenant-name').fill(newName);
  await page.getByTestId('update-tenant-sidebar-submit').click();
  tenantsPage = await TenantsPage.goTo(page);
  await assertPageShowsMessage(page, newName);
});
