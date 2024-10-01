import { expect, Page } from '@playwright/test';
import { test } from './utils/baseTest';
import { VARIANT_NAMES, VariantPreviewModalPage } from './page-models/variantPreviewModalPage';
import { WorkflowEditorPage } from './page-models/workflowEditorPage';
import { initializeSession, waitForNetworkIdle } from './utils/browser';
import { ChannelType } from './utils/ChannelType';
import { EditorState } from './page-models/editorState';
import { ChangesPage } from './page-models/changesPage';
import { SidebarPage } from './page-models/sidebarPage';
import { WorkflowsPage } from './page-models/workflowsPage';
import { addConditions } from './utils/commands';

test.beforeEach(async ({ page }) => {
  await initializeSession(page, { noTemplates: true });
});

test('Creates variant for email channel', async ({ page }) => {
  const emailSubject = 'test email subject';
  const emailParagraph = 'this is a test paragraph';
  const emailSubjectVariant = 'Variant test email subject';
  const emailParagraphVariant = 'Variant this is a test paragraph';
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillEmailNode(emailSubject, emailParagraph, 'Test Add Variant Flow for email');
  const emailVariantEditor = await workflowEditorPage.addVariantToEmailNode();
  await emailVariantEditor.assertEmailSubjectContains(emailSubject);
  await emailVariantEditor.assertEmailContentFirstParagraphContains(emailParagraph);
  const variantPreviewModalPage = await emailVariantEditor.updateEmailData(emailSubjectVariant, emailParagraphVariant);
  await workflowEditorPage.assertPageShowsPopUpMessage('Trigger code is updated successfully');
  await variantPreviewModalPage.assertHasVariant(VARIANT_NAMES.EMAIL);
});

test('Creates variant for inApp channel', async ({ page }) => {
  const inAppBody = 'this is a test paragraph';
  const inAppBodyVariant = 'Variant this is a test paragraph';

  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillInAppNode(inAppBody, 'Test Add Variant Flow for inApp');
  const inAppVariantEditor = await workflowEditorPage.addVariantToInAppNode();
  await inAppVariantEditor.assertPreviewText(inAppBody);
  const variantPreviewModalPage = await inAppVariantEditor.updateInAppData(inAppBodyVariant);
  await workflowEditorPage.assertPageShowsPopUpMessage('Trigger code is updated successfully');
  await variantPreviewModalPage.assertHasVariant(VARIANT_NAMES.IN_APP);
});

test('Creates variant for SMS channel', async ({ page }) => {
  const smsBody = 'this is a test paragraph';
  const smsBodyVariant = 'Variant this is a test paragraph';

  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillSmsNode(smsBody, 'Test Add Variant Flow for SMS');
  const smsVariantEditor = await workflowEditorPage.addVariantToSmsNode();
  await smsVariantEditor.assertBodyContains(smsBody);
  const variantPreviewModalPage = await smsVariantEditor.updateSmsData(smsBodyVariant);
  await workflowEditorPage.assertPageShowsPopUpMessage('Trigger code is updated successfully');
  await variantPreviewModalPage.assertHasVariant(VARIANT_NAMES.SMS);
});

test('Creates variant for Chat channel', async ({ page }) => {
  const chatBody = 'this is a test paragraph';
  const chatBodyVariant = 'Variant this is a test paragraph';

  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillChatNode(chatBody, 'Test Add Variant Flow for Chat');
  const chatVariantEditor = await workflowEditorPage.addVariantToChatNode();
  await chatVariantEditor.assertBodyContains(chatBody);
  const variantPreviewModalPage = await chatVariantEditor.updateChatData(chatBodyVariant);
  await workflowEditorPage.assertPageShowsPopUpMessage('Trigger code is updated successfully');
  await variantPreviewModalPage.assertHasVariant(VARIANT_NAMES.CHAT);
});

test('Creates variant for Push channel', async ({ page }) => {
  const pushSubject = 'this is a push subject';
  const pushBody = 'this is a test paragraph';

  const pushSubjectVariant = 'this is a push subject';
  const pushBodyVariant = 'Variant this is a test paragraph';

  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillPushNode(pushSubject, pushBody, 'Test Add Variant Flow for Push');
  const pushVariantEditor = await workflowEditorPage.addVariantToPushNode();
  await pushVariantEditor.assertPushSubjectContains(pushSubject);
  await pushVariantEditor.assertPushBodyContains(pushBody);
  const variantPreviewModalPage = await pushVariantEditor.updatePushData(pushSubjectVariant, pushBodyVariant);
  await workflowEditorPage.assertPageShowsPopUpMessage('Trigger code is updated successfully');
  await variantPreviewModalPage.assertHasVariant(VARIANT_NAMES.PUSH);
});

test('should allow creating variant from the step editor', async ({ page }) => {
  const inAppBody = 'this is a test paragraph';

  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.setWorkflowNameInput('Test Add Variant Flow from step editor');
  const nodeInAppEditingPageModel = await workflowEditorPage.addAndEditInAppNode();
  await nodeInAppEditingPageModel.fillNotificationBody(inAppBody);
  await nodeInAppEditingPageModel.getEditorAddVariantButton().click();

  await addConditions(page);

  await nodeInAppEditingPageModel.switchEditorMode(EditorState.PREVIEW);
  await nodeInAppEditingPageModel.assertPreviewText(inAppBody);
});

test('should allow adding multiple variants', async ({ page }) => {
  const inAppBody = 'this is a test paragraph';

  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.setWorkflowNameInput('Test Add multiple variants');
  const nodeInAppEditingPageModel = await workflowEditorPage.addAndEditInAppNode();
  await nodeInAppEditingPageModel.fillNotificationBody(inAppBody);
  await nodeInAppEditingPageModel.getEditorAddVariantButton().click();

  await addConditions(page);

  await nodeInAppEditingPageModel.closeSidePanel();
  const variantPreviewModalPage = new VariantPreviewModalPage(page);

  await variantPreviewModalPage.getVariantPreviewAddVariantButton().click();

  await addConditions(page);

  await variantPreviewModalPage.closeSidePanel();
  variantPreviewModalPage.assertHasVariantCount(2);
});

test('shold not allow adding variants for digest step', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.setWorkflowNameInput('Test no variants in digest');
  const nodeDigestEditorPageModal = await workflowEditorPage.addAndEditDigestNode();
  expect(page.getByTestId('editor-sidebar-add-variant')).toHaveCount(0);
  expect(page.getByTestId('add-variant-action')).toHaveCount(0);
  await nodeDigestEditorPageModal.closeSidePanel();
  await workflowEditorPage.hoverWorkflowNode(ChannelType.DIGEST, true);
  await workflowEditorPage.getStepActionsMenuButtonLocator().click();
  expect(page.getByTestId('editor-sidebar-add-variant')).toHaveCount(0);
  expect(page.getByTestId('add-variant-action')).toHaveCount(0);
});

test('shold not allow adding variants for delay step', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.setWorkflowNameInput('Test no variants in delay');
  const nodeDelayEditorPageModal = await workflowEditorPage.addAndEditDelayNode();
  expect(page.getByTestId('editor-sidebar-add-variant')).toHaveCount(0);
  expect(page.getByTestId('add-variant-action')).toHaveCount(0);
  await nodeDelayEditorPageModal.closeSidePanel();
  await workflowEditorPage.hoverWorkflowNode(ChannelType.DELAY, true);
  await workflowEditorPage.getStepActionsMenuButtonLocator().click();
  expect(page.getByTestId('editor-sidebar-add-variant')).toHaveCount(0);
  expect(page.getByTestId('add-variant-action')).toHaveCount(0);
});

// TODO: Fix Flakey test
test.skip('should show step actions with no variants', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.setWorkflowNameInput('Test no variants in delay');
  await workflowEditorPage.addChannelToWorkflow(ChannelType.IN_APP);
  await workflowEditorPage.hoverWorkflowNode(ChannelType.IN_APP);
  await expect(workflowEditorPage.getStepActionsMenuButtonLocator()).toBeVisible();
  await expect(workflowEditorPage.editAction()).toBeVisible();
  await expect(workflowEditorPage.getAddConditionsButton()).toBeVisible();
  await workflowEditorPage.getStepActionsMenuButtonLocator().click();
  await expect(workflowEditorPage.getAddVariantActionLocator()).toBeVisible();
  await expect(workflowEditorPage.getDeleteStepActionLocator()).toBeVisible();
});

// TODO: Fix Flakey test
test.skip('should show step actions with a variant', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.setWorkflowNameInput('Test no variants in delay');
  const nodeInAppEditingPageModel = await workflowEditorPage.addAndEditInAppNode();
  await nodeInAppEditingPageModel.fillNotificationBody('some notification body');
  await nodeInAppEditingPageModel.pressUpdate();
  await nodeInAppEditingPageModel.closeSidePanel();

  const variantOverviewPage = await workflowEditorPage.addVariantToInAppNode();

  await variantOverviewPage.closeSidePanel();

  await workflowEditorPage.hoverWorkflowNode(ChannelType.IN_APP);
  await expect(workflowEditorPage.getStepActionsMenuButtonLocator()).toBeVisible();
  await expect(workflowEditorPage.editAction()).toBeVisible();
  await expect(workflowEditorPage.getAddConditionsButton()).toBeVisible();
  await workflowEditorPage.getStepActionsMenuButtonLocator().click();
  await expect(workflowEditorPage.getAddVariantActionLocator()).toBeVisible();
  await expect(workflowEditorPage.getDeleteStepActionLocator()).toBeVisible();
});

test('should show only edit step in production for simple node', async ({ page }) => {
  let workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillSmsNode('this is a test paragraph', 'Test Add Variant Flow for SMS');

  const changesPage = await ChangesPage.goTo(page);
  await changesPage.getPromoteAllButton().click();
  const sidebarPage = await SidebarPage.goTo(page);
  await sidebarPage.toggleToProduction();

  await sidebarPage.getTemplatesLink().click();
  workflowEditorPage = await new WorkflowsPage(page).getFirstWorkflowEditor();
  const relevantNode = workflowEditorPage.getNode(ChannelType.SMS, 0);

  await relevantNode.hover();
  expect(relevantNode.getByTestId('conditions-action')).toHaveCount(0);
  expect(relevantNode.getByTestId('edit-action')).toHaveCount(1);
  expect(relevantNode.getByTestId('add-conditions-action')).toHaveCount(0);
  expect(relevantNode.getByTestId('step-actions-menu')).toHaveCount(0);
});

test.skip('should show edit step and conditions in production for node with conditions', async ({ page }) => {
  let workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillSmsNode('this is a test paragraph', 'Test Add Variant Flow for SMS');

  await workflowEditorPage.addConditionToNode(ChannelType.SMS);
  await workflowEditorPage.clickUpdate();

  const changesPage = await ChangesPage.goTo(page);
  await changesPage.getPromoteAllButton().click();
  const sidebarPage = await SidebarPage.goTo(page);
  await sidebarPage.toggleToProduction();

  await sidebarPage.getTemplatesLink().click();
  workflowEditorPage = await new WorkflowsPage(page).getFirstWorkflowEditor();
  const relevantNode = workflowEditorPage.getNode(ChannelType.SMS, 0);

  await relevantNode.hover();
  expect(relevantNode.getByTestId('conditions-action')).toHaveCount(0);
  expect(relevantNode.getByTestId('edit-action')).toHaveCount(1);
  expect(relevantNode.getByTestId('add-conditions-action')).toHaveCount(1);
  expect(relevantNode.getByTestId('step-actions-menu')).toHaveCount(0);
});

test('ensure the step editor has expected actions', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.setWorkflowNameInput('Test Add Variant Flow for email');
  await workflowEditorPage.addAndEditEmailNode();
  await assertHasExpectedNonVariantEditorButtons(page);
});

test('ensure the variant step editor has expected actions', async ({ page }) => {
  const emailSubject = 'test email subject';
  const emailParagraph = 'this is a test paragraph';

  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.setWorkflowNameInput('Test Add Variant Flow for email');
  const nodeEmailEditorPageModal = await workflowEditorPage.addAndEditEmailNode();
  await nodeEmailEditorPageModal.fillEmailSubject(emailSubject);
  await nodeEmailEditorPageModal.editEmailBodyTextParagraph(emailParagraph);
  await nodeEmailEditorPageModal.closeSidePanel();
  await workflowEditorPage.addVariantToEmailNode();

  await assertHasExpectedVariantEditorButtons(page);
});

test('ensure production node editor only shows close button for simple case', async ({ page }) => {
  let workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillSmsNode('this is a test paragraph', 'Test Add Flow for SMS');

  const changesPage = await ChangesPage.goTo(page);
  await changesPage.getPromoteAllButton().click();
  const sidebarPage = await SidebarPage.goTo(page);
  await sidebarPage.toggleToProduction();

  await sidebarPage.getTemplatesLink().click();
  workflowEditorPage = await new WorkflowsPage(page).getFirstWorkflowEditor();
  const smsNodeEditorPage = await workflowEditorPage.getFirstSmsNodeEditor();

  expect(smsNodeEditorPage.getEditorAddVariantButton()).toHaveCount(0);
  expect(smsNodeEditorPage.getAddConditionsSidebarButton()).toHaveCount(0);
  expect(smsNodeEditorPage.getEditConditionsButton()).toHaveCount(0);
  expect(smsNodeEditorPage.getDeleteButton()).toHaveCount(0);
  expect(smsNodeEditorPage.getCloseSidebarLocator()).toHaveCount(1);
});

test.skip('ensure production shows close and edit conditions button for conditioned node', async ({ page }) => {
  let workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillSmsNode('this is a test paragraph', 'Test Add Flow for SMS');
  await workflowEditorPage.addConditionToNode(ChannelType.SMS);
  await workflowEditorPage.clickUpdate();

  const changesPage = await ChangesPage.goTo(page);
  await changesPage.getPromoteAllButton().click();
  const sidebarPage = await SidebarPage.goTo(page);
  await sidebarPage.toggleToProduction();

  await sidebarPage.getTemplatesLink().click();
  workflowEditorPage = await new WorkflowsPage(page).getFirstWorkflowEditor();

  const smsNodeEditorPage = await workflowEditorPage.getFirstSmsNodeEditor();

  expect(smsNodeEditorPage.getEditorAddVariantButton()).toHaveCount(0);
  expect(smsNodeEditorPage.getAddConditionsSidebarButton()).toHaveCount(0);
  expect(smsNodeEditorPage.getEditConditionsButton()).toHaveCount(1);
  expect(smsNodeEditorPage.getDeleteButton()).toHaveCount(0);
  expect(smsNodeEditorPage.getCloseSidebarLocator()).toHaveCount(1);
});

test('Allows adding conditions on the step', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillInAppNode('this is a test paragraph', 'Test Add conditional Flow for inApp');
  const relevantNode = workflowEditorPage.getNode(ChannelType.IN_APP, 0);
  await relevantNode.hover();
  workflowEditorPage.getAddConditionsButton().click();
  await addConditions(page);
  workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await expect(workflowEditorPage.getAddConditionsButton()).toHaveCount(1);
  await expect(workflowEditorPage.getConditionsButton()).toHaveCount(1);
});

test('Allows adding conditions from the variants overview modal header', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillInAppNode('this is a test paragraph', 'Test Add conditional Flow for inApp');
  const inAppVariantEditor = await workflowEditorPage.addVariantToInAppNode();
  const variantOverview = await inAppVariantEditor.updateInAppData('some new content');
  await expect(variantOverview.getVariantAddConditionsButton()).toHaveCount(1);
  await variantOverview.addConditionToVariantNode();
  await expect(variantOverview.getVariantEditConditionsButton()).toHaveCount(1);
});

test('Allows adding second variant condition from the variants overview modal header', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.addAndFillInAppNode('this is a test paragraph', 'Test Add conditional Flow for inApp');
  const inAppVariantEditor = await workflowEditorPage.addVariantToInAppNode();
  const variantOverview = await inAppVariantEditor.updateInAppData('some new content');
  await expect(variantOverview.getVariantAtIndex(0)).toContainText('1');
  await variantOverview.addVariantConditionAtIndex(0);
  await expect(variantOverview.getVariantAtIndex(0)).toContainText('2');
});

test('Allows adding second condition from the in step editor', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const inAppEditor = await workflowEditorPage.addAndEditInAppNode();
  await inAppEditor.fillNotificationBody('some content');
  await inAppEditor.pressUpdate();
  await inAppEditor.addConditionViaSidebar();
  expect(inAppEditor.getEditConditionsButton()).toContainText('1');
  await inAppEditor.addMoreConditionViaSidebar();
  expect(inAppEditor.getEditConditionsButton()).toContainText('2');
});

async function assertHasExpectedNonVariantEditorButtons(page: Page) {
  await expect(page.getByTestId('editor-sidebar-add-variant')).toBeVisible();
  await expect(page.getByTestId('editor-sidebar-add-conditions')).toBeVisible();
  await expect(page.getByTestId('editor-sidebar-delete')).toBeVisible();
}

async function assertHasExpectedVariantEditorButtons(page: Page) {
  await expect(page.getByTestId('editor-sidebar-edit-conditions')).toBeVisible();
  await expect(page.getByTestId('editor-sidebar-delete')).toBeVisible();
}
