import { expect, Page } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { WorkflowsPage } from './page-models/workflowsPage';
import { deleteIndexedDB, initializeSession } from './utils.ts/browser';
import { clearDatabase, makeBlueprints } from './utils.ts/plugins';

test.beforeEach(async ({ context, page }) => {
  await clearDatabase();
  const { featureFlagsMock } = await initializeSession(page, { noTemplates: true });
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_BILLING_REVERSE_TRIAL_ENABLED: false,
    IS_TEMPLATE_STORE_ENABLED: true,
  });
  await deleteIndexedDB(page, 'localforage');
});

test.skip('TODO - the all templates tile should be disabled when there are no blueprints', async ({ page }) => {
  const workflowsPage = await WorkflowsPage.goTo(page);
  await expect(workflowsPage.getNoWorkflowsPlaceholder()).toBeVisible();
  await expect(workflowsPage.getCreateWorkflowTile()).toBeVisible();
  await expect(workflowsPage.getAllWorkflowTile()).toBeDisabled();
});

test('the all templates tile should be enabled and popular should be shown when blueprints are fetched', async ({
  page,
}) => {
  await makeBlueprints();

  // delay the response to check button disabled state
  page.route('**/blueprints/group-by-category', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.continue();
  });
  const workflowsPage = await WorkflowsPage.goTo(page);

  await expect(workflowsPage.getNoWorkflowsPlaceholder()).toBeVisible();
  await expect(workflowsPage.getCreateWorkflowTile()).toBeVisible();
  await expect(workflowsPage.getAllWorkflowTile()).toBeDisabled();

  await page.waitForResponse('**/blueprints/group-by-category');
  await expect(workflowsPage.getAllWorkflowTile()).toBeEnabled();
});

test('should show the popover when hovering over the popular tile', async ({ page }) => {
  await makeBlueprints();
  const workflowsPage = await WorkflowsPage.goTo(page);

  const response = await page.waitForResponse('**/blueprints/group-by-category');
  const responseBody = await response.json();
  const popularBlueprint = responseBody.data.popular.blueprints[0];
  const { name } = getBlueprintDetails(popularBlueprint.name);

  const popularTiles = workflowsPage.getPopularWorkflowTile();
  await expect(popularTiles).toHaveCount(2);
  await expect(popularTiles.nth(0)).toBeVisible();
  await expect(popularTiles.nth(1)).toBeVisible();

  await expect(popularTiles.nth(0)).toHaveText(name);
  await popularTiles.nth(0).hover();

  await expect(page.locator('.mantine-Popover-dropdown')).toBeVisible();
  await expect(page.locator('.mantine-Popover-dropdown')).toHaveText(popularBlueprint.description);
});

test('should show the popular dropdown items', async ({ page }) => {
  await makeBlueprints();
  const workflowsPage = await WorkflowsPage.goTo(page);
  const popularBlueprints = await getPopularBlueprints(page);
  const [first, second] = popularBlueprints;

  await expect(workflowsPage.getCreateWorkflowDropdown()).toBeVisible();
  await workflowsPage.getCreateWorkflowDropdown().click();
  await expect(workflowsPage.getCreateWorkflowButton()).toBeVisible();
  await expect(workflowsPage.getCreateAllTemplatesWorkflowButton()).toBeVisible();

  await expect(workflowsPage.getCreateTemplateDropdownItem()).toHaveCount(2);
  await expect(workflowsPage.getCreateTemplateDropdownItem().nth(0)).toContainText(first.name);
  await expect(workflowsPage.getCreateTemplateDropdownItem().nth(1)).toContainText(second.name);
});

test('should create template from the popular dropdown items', async ({ page }) => {
  await makeBlueprints();
  const workflowsPage = await WorkflowsPage.goTo(page);
  const popularBlueprints = await getPopularBlueprints(page);

  await expect(workflowsPage.getCreateWorkflowDropdown()).toBeVisible();
  await workflowsPage.getCreateWorkflowDropdown().click();
  await expect(workflowsPage.getCreateWorkflowButton()).toBeVisible();
  await expect(workflowsPage.getCreateAllTemplatesWorkflowButton()).toBeVisible();

  const createTemplateItem = workflowsPage.getCreateTemplateDropdownItem().nth(0);
  await expect(createTemplateItem).toContainText(popularBlueprints[0].name);
  await createTemplateItem.click();

  await page.waitForURL('/workflows/edit/*');
});

test('should show the popular description in the popover when hovering over the dropdown item', async ({ page }) => {
  await makeBlueprints();
  const workflowsPage = await WorkflowsPage.goTo(page);
  const popularBlueprints = await getPopularBlueprints(page);

  await expect(workflowsPage.getCreateWorkflowDropdown()).toBeVisible();
  await workflowsPage.getCreateWorkflowDropdown().click();
  await expect(workflowsPage.getCreateWorkflowButton()).toBeVisible();
  await expect(workflowsPage.getCreateAllTemplatesWorkflowButton()).toBeVisible();

  await expect(workflowsPage.getCreateTemplateDropdownItem()).toHaveCount(2);
  await expect(workflowsPage.getCreateTemplateDropdownItem().nth(0)).toContainText(popularBlueprints[0].name);
  await workflowsPage.getCreateTemplateDropdownItem().nth(0).hover();
  await expect(page.locator('.mantine-Popover-dropdown')).toBeVisible();
  await expect(page.locator('.mantine-Popover-dropdown')).toHaveText(popularBlueprints[0].description);
});

test('should create template from the popular tile items', async ({ page }) => {
  await makeBlueprints();
  const workflowsPage = await WorkflowsPage.goTo(page);
  const popularBlueprints = await getPopularBlueprints(page);

  const noWorkflowsPlaceholder = workflowsPage.getNoWorkflowsPlaceholder();
  await expect(noWorkflowsPlaceholder).toContainText(popularBlueprints[0].name);
  await noWorkflowsPlaceholder.click();

  await page.waitForURL('/workflows/edit/*');
});

test.skip('TODO - should show the templates store modal when clicking on the all templates tile', async ({ page }) => {
  const blueprints = await makeBlueprints();
  const workflowsPage = await WorkflowsPage.goTo(page);

  const allWorkflowTile = workflowsPage.getAllWorkflowTile();
  await expect(allWorkflowTile).toBeVisible();
  await expect(allWorkflowTile).toBeEnabled();
  await allWorkflowTile.click();

  const templateStoreModal = workflowsPage.getTemplateStoreModal();
  await expect(templateStoreModal.locator()).toBeVisible();

  await expect(templateStoreModal.getTemplateStoreModalUseTemplate()).toBeEnabled();
  await expect(templateStoreModal.getTemplateStoreModalUseTemplate()).toContainText('Use template');
  await expect(templateStoreModal.getWorkflowCanvas()).toBeVisible();

  const sideBarItems = await templateStoreModal.getSidebarItems().allTextContents();
  blueprints.forEach((blueprint) => {
    const { name } = getBlueprintDetails(blueprint.name);
    expect(sideBarItems).toContain(name);
  });
});

test('should show the templates store modal and allow selecting blueprints', async ({ page }) => {
  const blueprints = await makeBlueprints();
  const workflowsPage = await WorkflowsPage.goTo(page);

  const allWorkflowTile = workflowsPage.getAllWorkflowTile();
  await expect(allWorkflowTile).toBeVisible();
  await expect(allWorkflowTile).toBeEnabled();
  await allWorkflowTile.click();

  const templateStoreModal = workflowsPage.getTemplateStoreModal();
  await expect(templateStoreModal.locator()).toBeVisible();

  const { name: firstBlueprintName } = getBlueprintDetails(blueprints[0].name);
  const firstBluePrintItem = templateStoreModal.getBlueprintItem(firstBlueprintName);
  await firstBluePrintItem.click();
  expect(templateStoreModal.getBluePrintName(firstBlueprintName)).toBeVisible();
  expect(templateStoreModal.getBluePrintDescription()).toContainText(blueprints[0].description);

  const { name: secondBlueprintName } = getBlueprintDetails(blueprints[1].name);
  const secondBluePrintItem = templateStoreModal.getBlueprintItem(secondBlueprintName);
  await secondBluePrintItem.click();
  expect(templateStoreModal.getBluePrintName(secondBlueprintName)).toBeVisible();
  expect(templateStoreModal.getBluePrintDescription()).toContainText(blueprints[1].description);
});

test('should allow creating workflow from the blueprint and redirect to the editor', async ({ page }) => {
  await makeBlueprints();
  const workflowsPage = await WorkflowsPage.goTo(page);

  const allWorkflowTile = workflowsPage.getAllWorkflowTile();
  await expect(allWorkflowTile).toBeVisible();
  await expect(allWorkflowTile).toBeEnabled();
  await allWorkflowTile.click();

  const templateStoreModal = workflowsPage.getTemplateStoreModal();
  const templateStoreModalUseTemplate = templateStoreModal.getTemplateStoreModalUseTemplate();
  await expect(templateStoreModal.locator()).toBeVisible();
  await expect(templateStoreModalUseTemplate).toBeEnabled();
  await templateStoreModalUseTemplate.click();

  await page.waitForURL('/workflows/edit/*');
});

const getBlueprintDetails = (templateName: string): { name: string; iconName: string } => {
  const regexResult = /^:.{1,}:/.exec(templateName);
  let name = '';
  let iconName = 'fa-solid fa-question';
  if (regexResult !== null) {
    name = templateName.replace(regexResult[0], '').trim();
    iconName = regexResult[0].replace(/:/g, '').trim();
  }

  return { name, iconName: iconName };
};

// create function to get blueprints response from the endpoint
async function getPopularBlueprints(page: Page) {
  const response = await page.waitForResponse('**/blueprints/group-by-category');
  const body = await response.json();

  return body.data.popular.blueprints.map((blueprint) => {
    return { ...getBlueprintDetails(blueprint.name), description: blueprint.description };
  });
}
