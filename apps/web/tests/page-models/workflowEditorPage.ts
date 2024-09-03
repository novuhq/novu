import { Locator, Page, expect } from '@playwright/test';
import { dragAndDrop } from '../utils/browser';
import { WorkflowBaseSidePanelPage, WorkflowSettingsSidePanel } from './workflowSettingsSidePanel';
import { ChannelType } from '../utils/ChannelType';
import { NodeInAppEditingModalPageModel } from './nodeInAppEditingModalPageModel';
import { CodeSnippetSidePanelPageModel } from './codeSnippetSidePanelPageModel';
import { NodeEmailEditorPageModal } from './nodeEmailEditorPageModal';
import { NodeSmsEditingModalPageModel } from './nodeSmsEditingModalPageModel';
import { WorkflowTriggerSidebar } from './workflowTriggerSidebar';
import { NodeDigestEditorPageModal } from './nodeDigestEditorPageModal';
import { NodeChatEditingModalPageModel } from './nodeChatEditingModalPageModel';
import { NodePushEditorPageModal } from './nodePushEditorPageModal';
import { NodeDelayEditorPageModal } from './nodeDelayEditorPageModal';
import { ConditionsPage } from './conditionsPage';
import { addConditions } from '../utils/commands';

export class WorkflowEditorPage {
  async getFirstSmsNodeEditor() {
    await this.getNode(ChannelType.SMS, 0).hover();
    await this.editAction().click();

    return new NodeSmsEditingModalPageModel(this.page);
  }
  async addConditionToNode(channel: ChannelType) {
    await this.clickWorkflowNode(channel);
    await this.getAddConditionsButton().click();
    await addConditions(this.page);
    const sidePanel = new WorkflowSettingsSidePanel(this.page);
    await sidePanel.closeSidePanel();
  }
  async addVariantToPushNode() {
    await this.addVariantToNode(ChannelType.PUSH);

    return new NodePushEditorPageModal(this.page);
  }
  async addAndFillPushNode(pushSubject: string, pushBody: string, workflowTitle: string) {
    await this.setWorkflowNameInput(workflowTitle);
    const nodePushEditingPageModal = await this.addAndEditPushNode();
    await nodePushEditingPageModal.fillPushTitle(pushSubject);
    await nodePushEditingPageModal.fillPushContent(pushBody);
    await nodePushEditingPageModal.closeSidePanel();
  }
  async addVariantToChatNode() {
    await this.addVariantToNode(ChannelType.CHAT);

    return new NodeChatEditingModalPageModel(this.page);
  }
  async addAndFillChatNode(chatBody: string, workflowTitle: string) {
    await this.setWorkflowNameInput(workflowTitle);
    const nodeChatEditingPageModel = await this.addAndEditInChatNode();
    await nodeChatEditingPageModel.fillChatBody(chatBody);
    await nodeChatEditingPageModel.closeSidePanel();
  }
  async addVariantToSmsNode() {
    await this.addVariantToNode(ChannelType.SMS);

    return new NodeSmsEditingModalPageModel(this.page);
  }
  async addAndFillSmsNode(smsBody: string, workflowTitle: string) {
    await this.setWorkflowNameInput(workflowTitle);
    const nodeSmsEditingPageModel = await this.addAndEditInSmsNode();
    await nodeSmsEditingPageModel.fillSmsBody(smsBody);
    await nodeSmsEditingPageModel.nodeSettingsUpdateButton().click();
    await nodeSmsEditingPageModel.closeSidePanel();
  }
  async assertPageShowsPopUpMessage(expectedMessage: string) {
    await expect(this.page.getByText(expectedMessage)).toBeVisible();
  }
  async addVariantToInAppNode() {
    await this.addVariantToNode(ChannelType.IN_APP);

    return new NodeInAppEditingModalPageModel(this.page);
  }
  async addAndFillInAppNode(inAppBody: string, workflowTitle: string) {
    await this.setWorkflowNameInput(workflowTitle);
    const nodeInAppEditingPageModel = await this.addAndEditInAppNode();
    await nodeInAppEditingPageModel.fillNotificationBody(inAppBody);
    await nodeInAppEditingPageModel.closeSidePanel();
  }
  async addVariantToEmailNode() {
    await this.addVariantToNode(ChannelType.EMAIL);

    return new NodeEmailEditorPageModal(this.page);
  }
  async addVariantToNode(channel: ChannelType, last?: boolean) {
    await this.clickWorkflowNode(channel, last);
    const conditionsPage = await this.addVariantViaStepActions();
    await conditionsPage.getAddNewConditionButton().click();
    await conditionsPage.getConditionsFormKeyInput().fill('test');
    await conditionsPage.getConditionsFormValueInput().fill('test');
    await conditionsPage.getApplyConditionsButton().click();
  }

  async addVariantViaStepActions() {
    await this.getStepActionsMenuButtonLocator().click();
    await this.getAddVariantActionLocator().click();

    return new ConditionsPage(this.page);
  }
  async addAndFillEmailNode(emailSubject: string, emailParagraph: string, workflowTitle: string) {
    await this.setWorkflowNameInput(workflowTitle);
    const nodeEmailEditorPageModal = await this.addAndEditEmailNode();
    await nodeEmailEditorPageModal.fillEmailSubject(emailSubject);
    await nodeEmailEditorPageModal.editEmailBodyTextParagraph(emailParagraph);
    await nodeEmailEditorPageModal.closeSidePanel();
  }
  getEditConditionsButton(): any {
    return this.page.getByTestId('add-conditions-action');
  }
  public closeNotificationButton() {
    return this.page.locator('.mantine-Notification-closeButton');
  }
  EDITABLE_CHANNELS: ChannelType[] = [
    ChannelType.IN_APP,
    ChannelType.EMAIL,
    ChannelType.SMS,
    ChannelType.CHAT,
    ChannelType.PUSH,
  ];
  constructor(private page: Page) {}

  static async goToNewWorkflow(page: Page): Promise<WorkflowEditorPage> {
    await page.goto('../workflows/create');

    return new WorkflowEditorPage(page);
  }
  static async goToEditWorkflow(page: Page, templateId: string): Promise<WorkflowEditorPage> {
    await page.goto(`../workflows/edit/${templateId}`);

    return new WorkflowEditorPage(page);
  }

  private workflowSettingsSidePanel: WorkflowSettingsSidePanel;
  private workflowTriggerSidebar: WorkflowTriggerSidebar;

  public async openWorkflowSettingsSidePanel() {
    await this.page.getByTestId('settings-page').click();
    this.workflowSettingsSidePanel = new WorkflowSettingsSidePanel(this.page);

    return this.workflowSettingsSidePanel;
  }

  public async openWorkflowTriggerSidebar() {
    await this.nodeTriggerSelector().click();
    this.workflowTriggerSidebar = new WorkflowTriggerSidebar(this.page);

    return this.workflowTriggerSidebar;
  }

  async clickTriggerWorkflow() {
    await this.page.getByTestId('get-snippet-btn').click();

    return new CodeSnippetSidePanelPageModel(this.page);
  }

  getItemPhone() {
    return this.page.getByRole('button', { name: 'phonestring' });
  }

  setWorkflowNameInput(name: string) {
    return this.page.getByTestId('name-input').fill(name);
  }

  getPreviewSubject() {
    return this.page.getByTestId('preview-subject');
  }

  getPreviewContent() {
    return this.page.getByTestId('preview-content');
  }

  getPreviewModeSwitch() {
    return this.page.getByTestId('preview-mode-switch');
  }

  getPreviewJsonParam() {
    return this.page.getByTestId('preview-json-param');
  }

  getApplyVariablesLocator() {
    return this.page.getByTestId('apply-variables');
  }

  getTestEmailJsonParamsLocator() {
    return this.page.getByTestId('test-email-json-param');
  }

  getTestSendEmailBtnLocator() {
    return this.page.getByTestId('test-send-email-btn');
  }

  async getMantineNotificationRoot() {
    return this.page.locator('.mantine-Notification-root');
  }

  public settingsPage(): Locator {
    return this.page.getByTestId('settings-page');
  }

  body(): Locator {
    return this.page.locator('body');
  }

  getDragSideMenu() {
    return this.page.getByTestId('drag-side-menu');
  }

  addNodeButton(): Locator {
    return this.page.getByTestId('addNodeButton');
  }

  buttonAdd() {
    return this.page.getByTestId('button-add');
  }

  addSmsNode() {
    return this.page.getByTestId('add-sms-node');
  }

  addEmailNode() {
    return this.page.getByTestId('add-email-node');
  }

  editAction() {
    return this.page.getByTestId('edit-action');
  }

  getAddConditionsButton() {
    return this.page.getByTestId('add-conditions-action');
  }

  getConditionsButton() {
    return this.page.getByTestId('step-actions').getByTestId('conditions-action');
  }

  nodeEmailSelector() {
    return this.page.getByTestId('node-emailSelector');
  }

  nodeTriggerSelector() {
    return this.page.getByTestId('node-triggerSelector');
  }

  submitTemplateBtn() {
    return this.page.getByTestId('notification-template-submit-btn');
  }

  getStepActionsMenuButtonLocator() {
    return this.page.getByTestId('step-actions-menu');
  }

  getDeleteStepActionLocator() {
    return this.page.getByTestId('delete-step-action');
  }

  getAddVariantActionLocator() {
    return this.page.getByTestId('add-variant-action');
  }

  public async addAndEditInAppNode() {
    await this.addAndEditChannel(ChannelType.IN_APP);

    return new NodeInAppEditingModalPageModel(this.page);
  }

  public async addAndEditInSmsNode() {
    await this.addAndEditChannel(ChannelType.SMS);

    return new NodeSmsEditingModalPageModel(this.page);
  }
  public async addAndEditInChatNode() {
    await this.addAndEditChannel(ChannelType.CHAT);

    return new NodeChatEditingModalPageModel(this.page);
  }

  public async addAndEditEmailNode() {
    await this.addAndEditChannel(ChannelType.EMAIL);

    return new NodeEmailEditorPageModal(this.page);
  }

  async addAndEditDigestNode() {
    await this.addAndEditChannel(ChannelType.DIGEST);

    return new NodeDigestEditorPageModal(this.page);
  }

  async addAndEditDelayNode() {
    await this.addAndEditChannel(ChannelType.DELAY);

    return new NodeDelayEditorPageModal(this.page);
  }
  public async addAndEditPushNode() {
    await this.addAndEditChannel(ChannelType.PUSH);

    return new NodePushEditorPageModal(this.page);
  }
  public async addAndEditChannel(channel: ChannelType) {
    await this.addChannelToWorkflow(channel);
    await this.clickWorkflowNode(channel, true);
    await this.openNodeForEditing(channel);
  }

  private async openNodeForEditing(channel: ChannelType) {
    if (this.EDITABLE_CHANNELS.includes(channel)) {
      await this.page.getByTestId('channel-node').getByTestId('edit-action').click();
    }
  }

  public async addChannelToWorkflow(channel: ChannelType) {
    const source = this.page.getByTestId(`dnd-${channel}Selector`);
    const dest = this.page.getByTestId('addNodeButton').locator('..');
    await dragAndDrop(source, dest);
  }

  public async clickWorkflowNode(channel: ChannelType, last?: boolean) {
    const node = last
      ? this.page.getByTestId(`node-${channel}Selector`).last()
      : this.page.getByTestId(`node-${channel}Selector`).first();
    await node.click();
  }

  public async hoverWorkflowNode(channel: ChannelType, last?: boolean) {
    const node = last
      ? this.page.getByTestId(`node-${channel}Selector`).last()
      : this.page.getByTestId(`node-${channel}Selector`).first();
    await node.hover();
  }

  getNode(channel: ChannelType, number: number) {
    return this.page.getByTestId(`node-${channel}Selector`).nth(number);
  }

  getAllNodes() {
    return this.page.locator('.react-flow__node');
  }
  async getNodeSettings(channel: ChannelType) {
    await this.clickWorkflowNode(channel, true);
    await this.openNodeForEditing(channel);

    return new NodeDigestEditorPageModal(this.page);
  }
  getNodeSubtitle(channel: ChannelType, number: number) {
    return this.getNode(channel, number).getByTestId('workflow-node-subtitle');
  }

  async clickUpdate() {
    await this.page.getByTestId('notification-template-submit-btn').click();
  }
}
