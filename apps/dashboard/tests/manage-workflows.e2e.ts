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
  const workflowIdInput = await page.locator('input[name="workflowId"]');
  await expect(await workflowIdInput.inputValue()).toEqual(workflowId);

  // submit the form to see the tags validation errors
  await createWorkflowSidebar.createBtnClick();
  const tagsError = await createWorkflowSidebar.getTagsValidationError();
  await expect(tagsError).toBeVisible();

  // remove the tag
  await createWorkflowSidebar.removeTag('17');

  // submit the form as it should be valid
  await createWorkflowSidebar.createBtnClick({ awaitResponse: true });

  const workflowEditorPage = new WorkflowEditorPage(page);
  await expect(page).toHaveTitle(`${workflowName} | Novu Cloud Dashboard`);

  // check the sidebar form values
  const formValues = await workflowEditorPage.getWorkflowFormValues();
  await expect(formValues.nameValue).toEqual(workflowName);
  await expect(formValues.idValue).toMatch(/test-workflow.*/);
  await expect(formValues.descriptionValue).toEqual(workflowDescription);
  await expect(await formValues.tagBadges.count()).toEqual(16);

  // update the workflow name
  const workflowNameUpdated = `${workflowName}-updated`;
  await workflowEditorPage.updateWorkflowName(workflowNameUpdated);

  // add a step
  await workflowEditorPage.addStepAsLast(StepTypeEnum.IN_APP);
  let lastStep = await workflowEditorPage.getLastStep(StepTypeEnum.IN_APP);
  await expect(lastStep).toBeVisible();
  await workflowEditorPage.clickLastStep(StepTypeEnum.IN_APP);

  // check the step config sidebar
  const stepConfigSidebar = new StepConfigSidebar(page);
  await expect(page).toHaveTitle(`Configure ${inAppStepName} | Novu Cloud Dashboard`);

  // update the step name
  const inAppStepNameUpdated = `${inAppStepName}-updated`;
  await stepConfigSidebar.updateStepName({ oldStepName: inAppStepName, newStepName: inAppStepNameUpdated });
  await stepConfigSidebar.configureTemplateClick();

  const inAppStepEditor = new InAppStepEditor(page);
  // Wait for navigation and check title
  await page.waitForResponse('**/v2/workflows/**');
  const title = await page.title();
  await expect(title).toBe(`Edit ${inAppStepNameUpdated} | Novu Cloud Dashboard`);

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
  await expect(await previewElements.subject).toContainText(subject);
  await expect(await previewElements.body).toContainText(body);
  await inAppStepEditor.close();

  // add a second step
  await workflowEditorPage.addStepAsLast(StepTypeEnum.IN_APP);

  // check the step count
  let stepCount = await workflowEditorPage.getStepCount(StepTypeEnum.IN_APP);
  await expect(stepCount).toEqual(2);

  // check the last step
  lastStep = await workflowEditorPage.getLastStep(StepTypeEnum.IN_APP);
  await expect(lastStep).toBeVisible();

  // check the step config sidebar
  await expect(page).toHaveTitle(`Edit ${inAppStepName} | Novu Cloud Dashboard`);
  await inAppStepEditor.close();

  // delete the step
  await stepConfigSidebar.delete();

  // check the step count
  stepCount = await workflowEditorPage.getStepCount(StepTypeEnum.IN_APP);
  await expect(stepCount).toEqual(1);

  // go to the trigger tab
  await workflowEditorPage.triggerTabClick();

  // check the trigger workflow page
  const triggerWorkflowPage = new TriggerWorkflowPage(page);
  await expect(page).toHaveTitle(`Trigger ${workflowNameUpdated} | Novu Cloud Dashboard`);

  // trigger the workflow
  await triggerWorkflowPage.triggerWorkflowBtnClick();
  const activityPanel = await triggerWorkflowPage.getActivityPanel();
  await expect(activityPanel).toBeVisible();
  await expect(activityPanel.locator('span').filter({ hasText: workflowNameUpdated })).toBeVisible();

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
