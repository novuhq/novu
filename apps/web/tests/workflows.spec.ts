import { TriggerTypeEnum } from '@novu/shared';
import { expect } from '@playwright/test';
import { test } from './utils/baseTest';

import { WorkflowsPage } from './page-models/workflowsPage';
import { initializeSession } from './utils/browser';
import { createWorkflows, SessionData } from './utils/plugins';

let session: SessionData;

test.describe('Workflows tests without templates', () => {
  test.beforeEach(async ({ page }) => {
    ({ session } = await initializeSession(page, { noTemplates: true }));
  });
  test('when no workflows created it should show the page placeholder', async ({ page }) => {
    const workflowsPage = await WorkflowsPage.goTo(page);
    await expect(workflowsPage.getNoWorkflowsPlaceholder()).toBeVisible();
    await expect(workflowsPage.getCreateWorkflowTile()).toBeVisible();
  });
  test('when clicking on create workflow it should redirect to create workflow page', async ({ page }) => {
    const workflowsPage = await WorkflowsPage.goTo(page);
    await expect(workflowsPage.getNoWorkflowsPlaceholder()).toBeVisible();
    await expect(workflowsPage.getCreateWorkflowTile()).toBeVisible();
    await workflowsPage.getCreateWorkflowTile().click();
    await expect(page).toHaveURL(/\/workflows\/edit/);
  });
});
test.describe('Workflows tests with templates', () => {
  test.beforeEach(async ({ page }) => {
    ({ session } = await initializeSession(page));
  });

  test('should display workflows list', async ({ page }) => {
    const workflowsPage = await WorkflowsPage.goTo(page);
    const workflowsTable = workflowsPage.getWorkflowsTable();
    const firstRow = workflowsTable.locator('tbody tr').first();
    const editLink = await workflowsPage.getRowEditLink(firstRow);
    const foundTemplate = session.templates.find((template) => editLink?.includes(template._id));

    expect(foundTemplate).toBeDefined();
    expect(editLink).toBe(`/workflows/edit/${foundTemplate?._id}`);

    await workflowsPage.assertRowStatusLabel(firstRow, foundTemplate?.active ?? false);
    await workflowsPage.assertRowCategoryLabel(firstRow, 'General');
  });

  test('should show the create workflow dropdown', async ({ page }) => {
    const workflowsPage = await WorkflowsPage.goTo(page);
    await workflowsPage.getCreateWorkflowButton().click();
    await expect(workflowsPage.getCreateAllTemplatesWorkflowButton()).toContainText('All templates');
    await expect(workflowsPage.getCreateBlankWorkflowButton()).toContainText('Blank workflow');
  });

  test('should allow searching by name or identifier', async ({ page }) => {
    await createWorkflows({
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      workflows: [
        { name: 'SMS Workflow' },
        { triggers: [{ identifier: 'sms-test', variables: [], type: TriggerTypeEnum.EVENT }] },
      ],
    });

    const workflowsPage = await WorkflowsPage.goTo(page);
    const workflowsTable = workflowsPage.getWorkflowsTable();

    await workflowsPage.searchWorkflow('SMS');

    const firstRow = workflowsTable.locator('tbody tr').first();
    const secondRow = workflowsTable.locator('tbody tr').nth(1);

    // the order is not guaranteed
    if ((await workflowsPage.getWorkflowName(firstRow)) === 'SMS Workflow') {
      expect(await workflowsPage.getWorkflowTriggerIdentifier(secondRow)).toEqual('sms-test');
    } else {
      expect(await workflowsPage.getWorkflowName(secondRow)).toEqual('SMS Workflow');
      expect(await workflowsPage.getWorkflowTriggerIdentifier(firstRow)).toEqual('sms-test');
    }
  });

  test('should allow clearing the search', async ({ page }) => {
    const workflowsPage = await WorkflowsPage.goTo(page);
    await workflowsPage.searchWorkflow('This template does not exist');
    await expect(workflowsPage.getNoWorkflowsMatchesPlaceholder()).toBeVisible();

    await workflowsPage.clearSearchInput();
    await expect(workflowsPage.getNoWorkflowsPlaceholder()).not.toBeVisible();
  });

  test('should show no results view', async ({ page }) => {
    const workflowsPage = await WorkflowsPage.goTo(page);
    await workflowsPage.searchWorkflow('This template does not exist');
    await expect(workflowsPage.getNoWorkflowsMatchesPlaceholder()).toBeVisible();
  });
});
