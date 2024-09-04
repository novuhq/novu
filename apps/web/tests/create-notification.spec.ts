import { expect, Page } from '@playwright/test';
import { test } from './utils/baseTest';
import { WorkflowEditorPage } from './page-models/workflowEditorPage';
import { initializeSession } from './utils/browser';
import { ChannelType } from './utils/ChannelType';
import { CodeSnippetSidePanelPageModel, SNIPPET_TAB } from './page-models/codeSnippetSidePanelPageModel';
import { NodeEmailEditorPageModal } from './page-models/nodeEmailEditorPageModal';
import { NodeSmsEditingModalPageModel } from './page-models/nodeSmsEditingModalPageModel';
import { TimeUnit } from './page-models/nodeDigestEditorPageModal';
import { WorkflowsPage } from './page-models/workflowsPage';
import { WorkflowSettingsSidePanel } from './page-models/workflowSettingsSidePanel';
import { EditorState } from './page-models/editorState';

test.describe('Creation functionality', () => {
  test.beforeEach(async ({ page }) => {
    await initializeSession(page);
  });
  test('should create in-app notification', async ({ page }) => {
    const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
    await editWorkflowSettings(workflowEditorPage);
    await addInAppNode(workflowEditorPage);
    const snippetModal = await workflowEditorPage.clickTriggerWorkflow();
    await assertNodeSnippet(snippetModal);
    await snippetModal.changeSnippetTabTo(SNIPPET_TAB.CURL);
    await assertCurlSnippet(snippetModal);
  });
  test('should manage variables', async ({ page }) => {
    const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
    await editWorkflowSettings(workflowEditorPage);
    const emailEditorModal = await workflowEditorPage.addAndEditEmailNode();
    await testEditMode(emailEditorModal, page, workflowEditorPage);
    await testPreviewMode(emailEditorModal, workflowEditorPage);
    await testTestMode(emailEditorModal, workflowEditorPage);
  });

  test('should not clear the set default values of variables on update', async ({ page }) => {
    const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
    const emailEditorModal = await workflowEditorPage.addAndEditEmailNode();
    await fillEmailEditorWithTestData(emailEditorModal, page, false);
    await addVarDefaultValuesAndVerifyStickiness(emailEditorModal);
    await testVariableDefaultsInSmsNode(workflowEditorPage, emailEditorModal);
  });

  test('should not throw error for using array variable with index greater than 0', async ({ page }) => {
    const emailEditorModal = await createWorkflowAndEmailNode(page, editWorkflowSettings);
    await emailEditorModal.editEmailBodyTextParagraph('This tests array var {{array.[1].name}}', 0);
    await verifyArrayRecognizedAndAppearsCorrectlyInTheStepVariables(page);
  });

  test('should create email notification', async ({ page }) => {
    const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
    await editWorkflowSettings(workflowEditorPage);
    await createEmailNodeAndFillTestData(workflowEditorPage, page);
    const firstEmailNodeSubtitle = await workflowEditorPage.getNodeSubtitle(ChannelType.EMAIL, 0).textContent();
    expect(firstEmailNodeSubtitle).toContain(EMAIL_BODY_FIRST_LINE_TEXT);
    await assertCodeSnippetStructureIncludingVariables(workflowEditorPage, TEST_WORKFLOW_ID);
  });

  test.skip('should be able to add many nodes.', async ({ page }) => {
    test.slow();
    const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
    await editWorkflowSettings(workflowEditorPage, 'Test 10 Nodes');
    await createEmptyEmailNodes(workflowEditorPage, 10);
    await createEmailNodeAndFillWithTestData(workflowEditorPage, page);
    expect(await workflowEditorPage.nodeEmailSelector().count()).toBe(11);
    await assertTestDataSaved(workflowEditorPage, page);
  });
  test('should add digest node', async ({ page }) => {
    const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
    await editWorkflowSettings(workflowEditorPage, WORKFLOW_NAME);
    await addEmailNodeFillWithTestDataAndClose(workflowEditorPage, page);
    await createDigestNodeAndFillWithTestData(workflowEditorPage, DIGEST_TEST_DATA);
    await assertSettingsSaved(workflowEditorPage, DIGEST_TEST_DATA);
  });
  test('should not reset action steps values on update', async ({ page }) => {
    const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
    await editWorkflowSettings(workflowEditorPage, WORKFLOW_NAME);
    await addEmailNodeFillWithTestDataAndClose(workflowEditorPage, page);
    const nodeDigestEditorPageModal = await createDigestNodeAndFillWithTestData(workflowEditorPage, DIGEST_TEST_DATA);
    await nodeDigestEditorPageModal.nodeSettingsUpdateButton().click();
    await assertSettingsSaved(workflowEditorPage, DIGEST_TEST_DATA);
  });
  test('should create and edit group id', async ({ page }) => {
    const workflowEditorPage = await WorkflowEditorPage.goToEditWorkflow(page, sessionData.templates[0]._id);
    const workflowSettingsSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
    const groupLocator = await addANewCategory(workflowSettingsSidePanel);
    await workflowSettingsSidePanel.closeSidePanel();
    await workflowEditorPage.openWorkflowSettingsSidePanel();
    expect(await groupLocator.inputValue()).toBe('New Test Category');
    await workflowSettingsSidePanel.closeSidePanel();
    await workflowEditorPage.clickUpdate();
    const workflowsPage = await WorkflowsPage.goTo(page);
    await workflowsPage.clickTemplateEditLink(sessionData.templates[0]._id);
    await workflowEditorPage.settingsPage().click();
    expect(await groupLocator.inputValue()).toBe('New Test Category');
  });
  test('should show delay settings in side menu', async ({ page }) => {
    const workflowPage = await createWorkflow(page);
    const nodeDelayEditorPageModal = await workflowPage.addAndEditDelayNode();
    const delayNodeVisible = await workflowPage.getNode(ChannelType.DELAY, 0).isVisible();
    expect(delayNodeVisible).toBe(true);
    await expect(nodeDelayEditorPageModal.getDelayModeSwitch()).toBeVisible();
  });

  test.beforeEach(async ({ page }) => {
    const newSession = await initializeSession(page);
    sessionData = newSession.session;
  });
});
async function AddButtonToMailBodyEditTextAndValidate(emailEditorModal: NodeEmailEditorPageModal) {
  await emailEditorModal.clickAddElementToEmailPlusSign();
  await emailEditorModal.clickAddBtnBlock();
  await emailEditorModal.getButtonBlockWrapperLocator().click();
  await emailEditorModal.editButtonText(EMAIL_BUTTON_TEXT_WITH_HANDLEBARS);
  expect(await emailEditorModal.getButtonBlockWrapperLocator().innerText()).toContain(
    EMAIL_BUTTON_TEXT_WITH_HANDLEBARS
  );
}

async function addTextLineToEmailBodyAndValidate(emailEditorModal: NodeEmailEditorPageModal, text: string) {
  await emailEditorModal.clickEmailEditor();
  await emailEditorModal.clickEmailEditor();
  await emailEditorModal.clickAddElementToEmailPlusSign();
  await emailEditorModal.clickAddTextBlock();
  await emailEditorModal.editEmailBodyTextParagraph(text, 1);
}

async function validate3ElementsInEmailBody(emailEditorModal: NodeEmailEditorPageModal) {
  const settingLocators = await emailEditorModal.getAllRowSettingsLocators();
  expect(settingLocators.length).toBe(2);
}

async function removeButtonAndVerify(emailEditorModal: NodeEmailEditorPageModal, page: Page) {
  await emailEditorModal.clickSettingsRowButton(1);
  await emailEditorModal.clickRemoveRowButton();
  await expect(page.getByText(EMAIL_BUTTON_TEXT_WITH_HANDLEBARS)).toHaveCount(0);
  await emailEditorModal.getButtonBlockWrapperLocator().waitFor({ state: 'hidden' });
}
async function assertEmailBodyEditor(
  emailEditorModal: NodeEmailEditorPageModal,
  page: Page,
  shouldAddAnotherCustomVar: boolean
) {
  await emailEditorModal.editEmailBodyTextParagraph(EMAIL_BODY_FIRST_LINE_TEXT, 0);
  if (shouldAddAnotherCustomVar) {
    await AddButtonToMailBodyEditTextAndValidate(emailEditorModal);
    await validate3ElementsInEmailBody(emailEditorModal);
    await removeButtonAndVerify(emailEditorModal, page);
    await addTextLineToEmailBodyAndValidate(emailEditorModal, EMAIL_BODY_SECOND_LINE_TEXT_WITH_CUSTOM_VAR);
  }
}
async function assertSystemVariables(
  emailEditorModal: NodeEmailEditorPageModal,
  workflowEditorPage: WorkflowEditorPage
) {
  await emailEditorModal.getSystemVariablesButton().click();
  expect(await emailEditorModal.getVarItemStep().innerText()).toContain(STEP);
  expect(await emailEditorModal.getVarItemsBranding().innerText()).toContain(BRANDING);
  expect(await emailEditorModal.getVarItemsSubscriber().innerText()).toContain(SUBSCRIBER);
  await emailEditorModal.getVarItemsSubscriber().click();
  expect(await emailEditorModal.getItemFirstName().innerText()).toContain(FIRST_NAME);
  expect(await workflowEditorPage.getItemPhone().innerText()).toContain('string');
  await emailEditorModal.getStepVariablesButton().click();
  expect(await emailEditorModal.getItemCustomVariable().innerText()).toContain(CUSTOM_VARIABLE);
}

async function fillEmailEditorWithTestData(
  emailEditorModal: NodeEmailEditorPageModal,
  page: Page,
  shouldAddAnotherCustomVar: boolean
) {
  await assertEmailBodyEditor(emailEditorModal, page, shouldAddAnotherCustomVar);
  await emailEditorModal.fillEmailSubject(EMAIL_SUBJECT);
  await emailEditorModal.fillEmailPreheader(EMAIL_PREHEADER);
}

async function testEditMode(
  emailEditorModal: NodeEmailEditorPageModal,
  page: Page,
  workflowEditorPage: WorkflowEditorPage
) {
  await emailEditorModal.clickEmailEditor();
  await fillEmailEditorWithTestData(emailEditorModal, page, true);
  await emailEditorModal.getTranslationVariablesButton().click();
  await assertSystemVariables(emailEditorModal, workflowEditorPage);
}

async function testPreviewMode(emailEditorModal: NodeEmailEditorPageModal, workflowEditorPage: WorkflowEditorPage) {
  await emailEditorModal.switchEditorMode(EditorState.PREVIEW);
  expect(await workflowEditorPage.getPreviewSubject().innerText()).toContain(PREVIEW_SUBJECT);
  const previewContent = await workflowEditorPage.getPreviewContent().getAttribute('srcdoc');
  expect(previewContent).toContain(WRITTEN_TEXT);

  await workflowEditorPage.getPreviewModeSwitch().click();
  expect(await workflowEditorPage.getPreviewSubject().innerText()).toContain(PREVIEW_SUBJECT);
  const previewContentSwitched = await workflowEditorPage.getPreviewContent().getAttribute('srcdoc');
  expect(previewContentSwitched).toContain(WRITTEN_TEXT);

  await workflowEditorPage.getPreviewJsonParam().fill(JSON_PARAM);
  await workflowEditorPage.getApplyVariablesLocator().click();

  const previewContentUpdated = await workflowEditorPage.getPreviewContent().getAttribute('srcdoc');
  expect(previewContentUpdated).toContain(TEST_TEXT_NOVU);
  expect(previewContentUpdated).toContain(ANOTHER_TEXT_NOT_CUSTOM_VARIABLE);
}

async function testTestMode(emailEditorModal: NodeEmailEditorPageModal, workflowEditorPage: WorkflowEditorPage) {
  await emailEditorModal.switchEditorMode(EditorState.TEST);

  await workflowEditorPage.getTestEmailJsonParamsLocator().fill(JSON_PARAM);
  await workflowEditorPage.getTestSendEmailBtnLocator().click();
  const mantineLocator = await workflowEditorPage.getMantineNotificationRoot();
  await mantineLocator.waitFor();
  expect(await mantineLocator.textContent()).toContain(TEST_SENT_SUCCESSFULLY);
}

async function addVarDefaultValuesAndVerifyStickiness(emailEditorModal: NodeEmailEditorPageModal) {
  await emailEditorModal.getOpenEditVariablesButtonLocator().click();
  await emailEditorModal.getVariableDefaultValueLocator().fill('Test Var Value');
  await emailEditorModal.getCloseVarManagerModalLocator().click();
  await emailEditorModal.getNotificationTemplateSubmitButton().click();

  await emailEditorModal.getOpenEditVariablesButtonLocator().click();
  expect(await emailEditorModal.getVariableDefaultValueLocator().inputValue()).toBe('Test Var Value');
  await emailEditorModal.getCloseVarManagerModalLocator().click();
  await emailEditorModal.closeSidePanel();
}

async function validateDefaultVariableBehavior(
  nodeSmsEditingModalPageModel: NodeSmsEditingModalPageModel,
  emailEditorModal: NodeEmailEditorPageModal
) {
  await nodeSmsEditingModalPageModel.getOpenVariableManagementLocator().click();
  await nodeSmsEditingModalPageModel.getOpenEditVariablesButtonLocator().click();
  await nodeSmsEditingModalPageModel.getVariableDefaultValueLocator().fill('Test');
  await nodeSmsEditingModalPageModel.getCloseVarManagerModalLocator().click();
  await nodeSmsEditingModalPageModel.getNotificationTemplateSubmitButton().click();
  await nodeSmsEditingModalPageModel.getOpenVariableManagementLocator().click();
  await emailEditorModal.getOpenEditVariablesButtonLocator().click();
  expect(await emailEditorModal.getVariableDefaultValueLocator().inputValue()).toBe('Test');
}
async function createWorkflowAndEmailNode(
  page: Page,
  injectedCreateWorkflow: (p: WorkflowEditorPage) => Promise<void>
) {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await injectedCreateWorkflow(workflowEditorPage);
  const emailEditorModal = await workflowEditorPage.addAndEditEmailNode();
  await emailEditorModal.clickEmailEditor();
  await emailEditorModal.fillEmailSubject(EMAIL_SUBJECT);
  await emailEditorModal.fillEmailPreheader(EMAIL_PREHEADER);

  return emailEditorModal;
}

async function verifyArrayRecognizedAndAppearsCorrectlyInTheStepVariables(page: Page) {
  const arrayVarElement = page.getByTestId('var-items-array');
  expect(await arrayVarElement.textContent()).toContain('array');
  expect(await arrayVarElement.textContent()).toContain('object');
}
async function testVariableDefaultsInSmsNode(
  workflowEditorPage: WorkflowEditorPage,
  emailEditorModal: NodeEmailEditorPageModal
) {
  const nodeSmsEditingModalPageModel = await workflowEditorPage.addAndEditInSmsNode();
  await nodeSmsEditingModalPageModel.fillSmsBody('This is a test sms {{firstName}}');
  await validateDefaultVariableBehavior(nodeSmsEditingModalPageModel, emailEditorModal);
}

async function createEmailNodeAndFillTestData(workflowEditorPage: WorkflowEditorPage, page: Page) {
  const emailEditorModal = await workflowEditorPage.addAndEditEmailNode();
  await emailEditorModal.clickEmailEditor();
  await fillEmailEditorWithTestData(emailEditorModal, page, true);
  await emailEditorModal.nodeSettingsUpdateButton().click();
  await emailEditorModal.closeSidePanel();
}

async function assertCodeSnippetStructureIncludingVariables(
  workflowEditorPage: WorkflowEditorPage,
  TEST_WORKFLOW_ID: string
) {
  const codeSnippetSidePanelPageModel = await workflowEditorPage.clickTriggerWorkflow();
  const triggerCodeSnippet = codeSnippetSidePanelPageModel.getTriggerCodeSnippet();
  expect(await triggerCodeSnippet.isVisible()).toBe(true);
  const codeSnippet = await triggerCodeSnippet.textContent();
  expect(codeSnippet).toContain(TEST_WORKFLOW_ID);
  expect(codeSnippet).toContain('firstName:');
  expect(codeSnippet).toContain('customVariable:');
}
async function createEmptyEmailNodes(workflowEditorPage: WorkflowEditorPage, total: number) {
  for (let i = 0; i < total; i += 1) {
    await workflowEditorPage.buttonAdd().last().click({ force: true });
    await workflowEditorPage.addEmailNode().click();
  }
}

async function createEmailNodeAndFillWithTestData(workflowEditorPage: WorkflowEditorPage, page: Page) {
  const nodeEmailEditorPageModal = await workflowEditorPage.addAndEditEmailNode();
  await nodeEmailEditorPageModal.clickEmailEditor();
  await fillEmailEditorWithTestData(nodeEmailEditorPageModal, page, false);
  await nodeEmailEditorPageModal.nodeSettingsUpdateButton().click();
  await nodeEmailEditorPageModal.closeSidePanel();
}

async function assertTestDataSaved(workflowEditorPage: WorkflowEditorPage, page: Page) {
  await workflowEditorPage.clickWorkflowNode(ChannelType.EMAIL, true);
  await workflowEditorPage.editAction().click();
  const emailPage = new NodeEmailEditorPageModal(page);

  expect(await emailPage.editableTextContent().textContent()).toContain('This text is written from a test');
  expect(await emailPage.emailSubject().inputValue()).toBe('this is email subject');
  expect(await emailPage.emailPreheader().inputValue()).toBe('this is email preheader');
}
async function createDigestNodeAndFillWithTestData(workflowEditorPage: WorkflowEditorPage, digestData: DigestTestData) {
  const digest = await workflowEditorPage.addAndEditDigestNode();
  await digest.digestSendOptionsAccordionSwitch().click();
  await digest.timeAmount().fill(`${digestData.timeAmount}`);
  await digest.chooseTimeUnitFromDropdown(digest, digestData.timeUnit);
  await digest.digestSendOptionsAccordionSwitch().click();
  await digest.onlyFrequentEventsSwitch().click({ force: true });
  await digest.backoffAmount().fill(`${digestData.backoffAmount}`);
  await digest.chooseTimeUnitBackOffFromDropDown(digest, digestData.timeUnitBackoff);
  await digest.digestGroupByOptions().click();
  await digest.batchKey().fill(digestData.batchKey);
  await digest.closeSidePanel();

  return digest;
}

function removeSuffix(digestData: TimeUnit) {
  const str: string = digestData;
  if (str.endsWith(' (s)')) {
    return str.slice(0, -4);
  } else {
    return str;
  }
}

async function assertSettingsSaved(workflowEditorPage: WorkflowEditorPage, digestData: DigestTestData) {
  const digest = await workflowEditorPage.getNodeSettings(ChannelType.DIGEST);
  await digest.digestSendOptionsAccordionSwitch().click();
  expect(await digest.timeAmount().inputValue()).toBe(`${digestData.timeAmount}`);
  expect(await digest.batchKey().inputValue()).toBe(digestData.batchKey);
  expect(await digest.backoffAmount().inputValue()).toBe(`${digestData.backoffAmount}`);
  expect(await digest.timeUnit().inputValue()).toBe(digestData.timeUnit);
  expect(await digest.timeUnitBackoff().inputValue()).toBe(digestData.timeUnitBackoff);
  await expect(workflowEditorPage.getNodeSubtitle(ChannelType.DIGEST, 0)).toContainText(
    `after ${digestData.backoffAmount} ${removeSuffix(digestData.timeUnitBackoff).toLowerCase()}`
  );
}

async function addEmailNodeFillWithTestDataAndClose(workflowEditorPage: WorkflowEditorPage, page: Page) {
  const nodeEMailEditorPageModal = await workflowEditorPage.addAndEditEmailNode();
  await nodeEMailEditorPageModal.clickEmailEditor();
  await fillEmailEditorWithTestData(nodeEMailEditorPageModal, page, false);
  await nodeEMailEditorPageModal.closeSidePanel();
}

const DIGEST_TEST_DATA = {
  backoffAmount: 20,
  batchKey: 'id',
  timeAmount: 20,
  timeUnit: TimeUnit.MINUTES,
  timeUnitBackoff: TimeUnit.MINUTES,
};

async function addANewCategory(workflowSettingsSidePanel: WorkflowSettingsSidePanel) {
  const groupLocator = workflowSettingsSidePanel.groupSelector();
  await groupLocator.click();
  await groupLocator.fill('');
  await groupLocator.fill('New Test Category');
  await workflowSettingsSidePanel.createGroupButton().click();

  return groupLocator;
}
async function editWorkflowSettings(workflowEditorPage: WorkflowEditorPage, title: string = WORKFLOW_NAME) {
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillTitle(title);
  await workflowSidePanel.fillDescription(WORKFLOW_DESCRIPTION);
  await workflowSidePanel.closeSidePanel();
}

async function addInAppNode(workflowEditorPage: WorkflowEditorPage) {
  const nodeSidePanel = await workflowEditorPage.addAndEditInAppNode();
  await nodeSidePanel.fillNotificationBody(IN_APP_EDITOR_HANDLEBAR_TEXT);
  await nodeSidePanel.fillInAppRedirect(REDIRECT_URL);
  await nodeSidePanel.getStepVariablesButton().waitFor();
  await nodeSidePanel.switchEditorMode(EditorState.PREVIEW);
  await nodeSidePanel.assertPreviewText(IN_APP_EDITOR_HANDLEBAR_RESOLVED_TEXT);
  await nodeSidePanel.pressUpdate();
  await nodeSidePanel.goBack();
}

async function assertNodeSnippet(snippetModal: CodeSnippetSidePanelPageModel) {
  const snippetText = await snippetModal.getTriggerCodeSnippet().textContent();
  expect(snippetText).toContain(TEST_WORKFLOW_ID);
  expect(snippetText).toContain(NODE_CODE_IMPORT_SAMPLE);
}

async function createWorkflow(page: Page) {
  const workflowPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await editWorkflowSettings(workflowPage);

  return workflowPage;
}
async function assertCurlSnippet(snippetModal: CodeSnippetSidePanelPageModel) {
  const curlSnippetText = await snippetModal.getCurlSnippet();
  expect(curlSnippetText).toContain("-H 'Authorization: ApiKey");
  expect(curlSnippetText).toContain('taskName');
}
interface DigestTestData {
  timeAmount: number;
  batchKey: string;
  backoffAmount: number;
  timeUnit: TimeUnit;
  timeUnitBackoff: TimeUnit;
}

const WORKFLOW_NAME = 'Test Notification Title';
const WORKFLOW_DESCRIPTION = 'This is a test description for a test title';
const EMAIL_BUTTON_TEXT_WITH_HANDLEBARS = 'Example Text Of {{ctaName}}';
const EMAIL_BODY_FIRST_LINE_TEXT = 'This text is written from a test {{firstName}}';
const EMAIL_BODY_SECOND_LINE_TEXT_WITH_CUSTOM_VAR = 'This another text will be {{customVariable}}';
const EMAIL_SUBJECT = 'this is email subject';
const EMAIL_PREHEADER = 'this is email preheader';
const STEP = 'step';
const BRANDING = 'branding';
const SUBSCRIBER = 'subscriber';
const FIRST_NAME = 'firstName';
const CUSTOM_VARIABLE = 'customVariable';
const PREVIEW_SUBJECT = 'this is email subject';
const WRITTEN_TEXT = 'This text is written from a test';
const JSON_PARAM = `{
  "firstName": "Novu",
  "customVariable": "notCustomVariable"
}`;
const TEST_TEXT_NOVU = 'This text is written from a test Novu';
const ANOTHER_TEXT_NOT_CUSTOM_VARIABLE = 'This another text will be notCustomVariable';
const TEST_SENT_SUCCESSFULLY = 'Test sent successfully!';
let sessionData;
const TEST_WORKFLOW_ID = 'test-notification-title';
const NODE_CODE_IMPORT_SAMPLE = "import { Novu } from '@novu/node'";
const IN_APP_EDITOR_HANDLEBAR_TEXT = '<p>{{firstName}} someone assigned you to {{taskName}}</p>';
const REDIRECT_URL = '/example/test';
const IN_APP_EDITOR_HANDLEBAR_RESOLVED_TEXT = 'firstName someone assigned you to taskName';
