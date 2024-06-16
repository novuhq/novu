import { expect } from '@playwright/test';
import { fillTextInAMonacoEditor } from '../utils/browser';
import { addConditions } from '../utils/commands';
import { ConditionsPage } from './conditionsPage';
import { EditorState } from './editorState';
import { VariantPreviewModalPage } from './variantPreviewModalPage';
import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';

export class NodeInAppEditingModalPageModel extends WorkflowBaseSidePanelPage {
  async addMoreConditionViaSidebar() {
    await this.getEditConditionsButton().click();
    await addConditions(this.page);
  }
  async addConditionViaSidebar() {
    await this.getAddConditionsSidebarButton().click();
    await addConditions(this.page);
  }
  async updateInAppData(inAppBodyVariant: string) {
    await this.fillNotificationBody(inAppBodyVariant);
    await this.nodeSettingsUpdateButton().click();
    await this.closeSidePanel();

    return new VariantPreviewModalPage(this.page);
  }

  async fillNotificationBody(notificationBody: string) {
    await fillTextInAMonacoEditor(this.page, '.monaco-editor', notificationBody);
  }

  async fillInAppRedirect(redirect: string) {
    await this.page.getByTestId('inAppRedirect').fill(redirect);
  }

  getAddConditionsAction() {
    return this.page.getByTestId('add-conditions-action');
  }

  getEnableAddAvatarToggle() {
    return this.page.getByTestId('enable-add-avatar');
  }

  getChooseAvatarButton() {
    return this.page.getByTestId('choose-avatar-btn');
  }

  getAvatarIconInfo() {
    return this.page.getByTestId('avatar-icon-info');
  }

  getFeedButton(nth: number) {
    return this.page.getByTestId(`feed-button-${nth}`);
  }

  getFeedButtonChecked(nth: number) {
    return this.page.getByTestId(`feed-button-${nth}-checked`);
  }

  createAndFillFeedInput(text: string) {
    return this.page.getByTestId('create-feed-input').fill(text);
  }

  getAddFeedButton() {
    return this.page.getByTestId('add-feed-button');
  }

  getUseFeedsCheckbox() {
    return this.page.getByTestId('use-feeds-checkbox');
  }

  getControlAddButton() {
    return this.page.getByTestId('control-add');
  }

  getTemplateContainerClickArea() {
    return this.page.getByTestId('template-container-click-area');
  }

  getTemplateContainer() {
    return this.page.getByTestId('template-container');
  }

  getRemoveButtonIcon() {
    return this.page.getByTestId('remove-button-icon');
  }

  async openAddConditionsSidebar() {
    await this.page.getByTestId('add-conditions-action').click();

    return new ConditionsPage(this.page);
  }

  async assertPreviewText(assertedText: string) {
    await this.switchEditorMode(EditorState.PREVIEW);
    const previewText = await this.page.getByTestId('in-app-content-preview').textContent();
    expect(previewText).toContain(assertedText);
    await this.switchEditorMode(EditorState.EDIT);
  }

  async pressUpdate() {
    await this.page.getByTestId('notification-template-submit-btn').click();
  }

  public async goBack() {
    const closeButton = this.page.getByTestId('sidebar-close');
    await closeButton.click();
  }
}
