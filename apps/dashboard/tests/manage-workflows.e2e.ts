import { expect } from '@playwright/test';
import { StepTypeEnum } from '@novu/shared';

import { test } from './utils/fixtures';
import { InAppStepEditor } from './page-object-models/in-app-step-editor';
import { WorkflowsPage } from './page-object-models/workflows-page';
import { CreateWorkflowSidebar } from './page-object-models/create-workflow-sidebar';
import { WorkflowEditorPage } from './page-object-models/workflow-editor-page';
import { StepConfigSidebar } from './page-object-models/step-config-sidebar';
import { TriggerWorkflowPage } from './page-object-models/trigger-workflow-page';

test('manage workflows', async ({ page }) => {
  const workflowName = 'test-workflow';
  const workflowId = workflowName;
  const workflowDescription = 'Test workflow description';
  const inAppStepName = 'In-App Step';
  const subject = 'You have been invited to join the Novu project';
  const body = "Hello {{payload.name}}! You've been invited to join the Novu project";

  const workflowsPage = new WorkflowsPage(page);
  await workflowsPage.goTo();
  await expect(page).toHaveTitle(`Workflows | Novu Cloud Dashboard`);

  await workflowsPage.createWorkflowBtnClick();

  // submit the form to see the validation errors
  const createWorkflowSidebar = new CreateWorkflowSidebar(page);
  await createWorkflowSidebar.createBtnClick();

  // check the validation errors
  const nameError = await createWorkflowSidebar.getNameValidationError();
  await expect(nameError).toBeVisible();

  // fill the form
  await createWorkflowSidebar.fillForm({
    workflowName,
    workflowDescription,
    tags: 17,
  });
  // check the workflow id
  const workflowIdInput = page.locator('input[name="workflowId"]');
  expect(await workflowIdInput.inputValue()).toEqual(workflowId);

  // submit the form to see the tags validation errors
  await createWorkflowSidebar.createBtnClick();
  const tagsError = await createWorkflowSidebar.getTagsValidationError();
  await expect(tagsError).toBeVisible();

  // remove the tag
  await createWorkflowSidebar.removeTag('17');

  // submit the form as it should be valid
  await createWorkflowSidebar.createBtnClick();

  const workflowEditorPage = new WorkflowEditorPage(page);
  await expect(page).toHaveTitle(`${workflowName} | Novu Cloud Dashboard`);

  // check the sidebar form values
  const formValues = await workflowEditorPage.getWorkflowFormValues();
  expect(formValues.nameValue).toEqual(workflowName);
  expect(formValues.idValue).toMatch(/test-workflow.*/);
  expect(formValues.descriptionValue).toEqual(workflowDescription);
  expect(await formValues.tagBadges.count()).toEqual(16);

  // update the workflow name
  const workflowNameUpdated = `${workflowName}-updated`;
  await workflowEditorPage.updateWorkflowName(workflowNameUpdated);
  await expect(page).toHaveTitle(`${workflowNameUpdated} | Novu Cloud Dashboard`);

  // add a step
  await workflowEditorPage.addStepAsLast(StepTypeEnum.IN_APP);
  await expect(workflowEditorPage.getLastStep(StepTypeEnum.IN_APP)).toBeVisible();

  const inAppStepEditor = new InAppStepEditor(page);
  // Wait for navigation and check title
  await expect(page).toHaveTitle(`Edit ${inAppStepName} | Novu Cloud Dashboard`);

  // check the validation errors
  await expect(await inAppStepEditor.getBodyValidationError()).toBeVisible();

  await inAppStepEditor.fillForm({
    subject,
    body,
    action: 'both',
  });
  // check the saved indicator
  await expect(await inAppStepEditor.getSavedIndicator()).toBeVisible();

  // check the preview
  await inAppStepEditor.previewTabClick();
  // TODO: add assertions for the primary and secondary actions
  const previewElements = await inAppStepEditor.getPreviewElements();
  await expect(previewElements.subject).toContainText(subject);
  await expect(previewElements.body).toContainText(body);
  await inAppStepEditor.close();

  // check the step config sidebar
  const stepConfigSidebar = new StepConfigSidebar(page);
  await expect(page).toHaveTitle(`Configure ${inAppStepName} | Novu Cloud Dashboard`);

  // update the step name
  const inAppStepNameUpdated = `${inAppStepName}-updated`;
  await stepConfigSidebar.updateStepName({ oldStepName: inAppStepName, newStepName: inAppStepNameUpdated });
  await expect(page).toHaveTitle(`Configure ${inAppStepNameUpdated} | Novu Cloud Dashboard`);

  // add a second step
  await workflowEditorPage.addStepAsLast(StepTypeEnum.IN_APP);

  // check the step count
  await expect(workflowEditorPage.getSteps(StepTypeEnum.IN_APP)).toHaveCount(2);

  // check the step config sidebar
  await expect(page).toHaveTitle(`Edit ${inAppStepName} | Novu Cloud Dashboard`);
  await inAppStepEditor.close();

  // delete the step
  await stepConfigSidebar.delete();

  // check the step count
  await expect(workflowEditorPage.getSteps(StepTypeEnum.IN_APP)).toHaveCount(1);

  await workflowEditorPage.addStepAsFirst(StepTypeEnum.DIGEST);

  // check the step config sidebar
  await expect(page).toHaveTitle(`Configure Digest Step | Novu Cloud Dashboard`);
  const digestStepConfigSidebar = new StepConfigSidebar(page);
  await digestStepConfigSidebar.setRegularDigestAmountInputValue('5');
  await digestStepConfigSidebar.close();
  // await for the workflow to be updated
  await page.waitForResponse(
    (resp) => resp.url().includes('/v2/workflows/') && resp.request().method() === 'PUT' && resp.status() === 200
  );

  // go to the trigger tab
  await workflowEditorPage.triggerTabClick();

  // check the trigger workflow page
  const triggerWorkflowPage = new TriggerWorkflowPage(page);
  await expect(page).toHaveTitle(`Trigger ${workflowNameUpdated} | Novu Cloud Dashboard`);

  // trigger the workflow
  await triggerWorkflowPage.triggerWorkflowBtnClick();

  // check the activity panel skeleton
  let activityPanelSkeleton = triggerWorkflowPage.getActivityPanelSkeleton();
  await expect(activityPanelSkeleton).toBeVisible();

  // check the activity panel
  let activityPanel = triggerWorkflowPage.getActivityPanel();
  await expect(activityPanel).toBeVisible();
  await expect(activityPanel.locator('span').filter({ hasText: workflowNameUpdated })).toBeVisible();
  await expect(activityPanel.getByTestId('activity-status')).toHaveText('pending');

  // trigger the workflow second time to see digested activity
  await triggerWorkflowPage.triggerWorkflowBtnClick();

  activityPanelSkeleton = triggerWorkflowPage.getActivityPanelSkeleton();
  await expect(activityPanelSkeleton).toBeVisible();

  activityPanel = triggerWorkflowPage.getActivityPanel();
  await expect(activityPanel).toBeVisible();
  await expect(activityPanel.locator('span').filter({ hasText: workflowNameUpdated })).toBeVisible();
  await expect(activityPanel.getByTestId('activity-status')).toHaveText('merged');

  // click the view execution to see the parent execution
  await activityPanel.locator('button').filter({ hasText: 'View Execution' }).click();

  // check the activity panel pending status
  await expect(activityPanel.getByTestId('activity-status')).toHaveText('pending');

  // wait for the parent execution to be completed
  await expect(activityPanel.getByTestId('activity-status')).toHaveText('completed');

  // Navigate back to workflows page
  await workflowEditorPage.clickWorkflowsBreadcrumb();
  await expect(page).toHaveTitle(`Workflows | Novu Cloud Dashboard`);

  // Verify workflow exists and status
  const workflowElement = await workflowsPage.getWorkflowElement(workflowNameUpdated);
  await expect(workflowElement).toBeVisible();

  const activeBadge = await workflowsPage.getWorkflowStatusBadge(workflowNameUpdated, 'Active');
  await expect(activeBadge).toBeVisible();

  // Pause workflow
  await workflowsPage.clickWorkflowActionsMenu(workflowNameUpdated);
  await workflowsPage.pauseWorkflow();
  const inactiveBadge = await workflowsPage.getWorkflowStatusBadge(workflowNameUpdated, 'Inactive');
  await expect(inactiveBadge).toBeVisible();

  // Enable workflow
  await workflowsPage.clickWorkflowActionsMenu(workflowNameUpdated);
  await workflowsPage.enableWorkflow();
  const newActiveBadge = await workflowsPage.getWorkflowStatusBadge(workflowNameUpdated, 'Active');
  await expect(newActiveBadge).toBeVisible();

  // Delete workflow
  await workflowsPage.clickWorkflowActionsMenu(workflowNameUpdated);
  await workflowsPage.deleteWorkflow();
  const deletedWorkflowElement = await workflowsPage.getWorkflowElement(workflowNameUpdated);
  await expect(deletedWorkflowElement).not.toBeVisible();
});
