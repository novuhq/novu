import { Page } from '@playwright/test';
import { BasePage } from './basePage';
import { EditorState } from './editorState';

export abstract class WorkflowBaseSidePanelPage extends BasePage {
  protected constructor(page: Page) {
    super(page);
  }
  nodeSettingsUpdateButton() {
    return this.page.getByTestId('notification-template-submit-btn');
  }
  getAddConditionsSidebarButton() {
    return this.page.getByTestId('editor-sidebar-add-conditions');
  }
  getEditConditionsButton() {
    return this.page.getByTestId('editor-sidebar-edit-conditions');
  }
  async closeSidePanel() {
    await this.getCloseSidebarLocator().click();
  }
  getDeleteButton() {
    return this.page.getByTestId('editor-sidebar-delete');
  }
  getCloseSidebarLocator() {
    return this.page.getByTestId('sidebar-close');
  }

  getStepActiveSwitch() {
    return this.page.getByTestId('step-active-switch').locator('..');
  }

  getStepShouldStopOnFailSwitch() {
    return this.page.getByTestId('step-should-stop-on-fail-switch').locator('..');
  }

  getOpenEditVariablesButtonLocator() {
    return this.page.getByTestId('open-edit-variables-btn');
  }

  getVariableDefaultValueLocator() {
    return this.page.getByTestId('variable-default-value');
  }

  getCloseVarManagerModalLocator() {
    return this.page.getByTestId('close-var-manager-modal');
  }

  getNotificationTemplateSubmitButton() {
    return this.page.getByTestId('notification-template-submit-btn');
  }

  getStepActionsMenuButtonLocator() {
    return this.page.getByTestId('step-actions-menu');
  }

  getDeleteStepActionLocator() {
    return this.page.getByTestId('delete-step-action');
  }

  public async switchEditorMode(emailEditorState: EditorState) {
    const locator = this.page.getByTestId('editor-mode-switch').getByText(emailEditorState);
    await locator.click();
  }

  getStepVariablesButton() {
    return this.page.getByTestId('var-label').getByText('Step Variables');
  }
  getEditorAddVariantButton() {
    return this.page.getByTestId('editor-sidebar-add-variant');
  }
}

export class WorkflowSettingsSidePanel extends WorkflowBaseSidePanelPage {
  public getTitleLocator() {
    return this.page.getByTestId('title');
  }

  public getDescriptionLocator() {
    return this.page.getByTestId('description');
  }

  public getActiveToggleSwitch() {
    return this.page.getByTestId('active-toggle-switch');
  }

  public clickToggleSwitch() {
    return this.page.locator('.mantine-Switch-thumb').click();
  }

  public async fillTitle(title: string) {
    await this.getTitleLocator().fill(title);
  }

  public async fillDescription(fillDescription: string) {
    await this.getDescriptionLocator().fill(fillDescription);
  }
  public async fillBasicNotificationDetails({ title, description }: { title?: string; description?: string } = {}) {
    const titleLocator = this.getTitleLocator();
    await titleLocator.clear();
    await titleLocator.fill(title ?? 'Test Notification Title');

    const descriptionLocator = this.getDescriptionLocator();
    await descriptionLocator.fill(description ?? 'This is a test description for a test title');
  }

  groupSelector() {
    return this.page.getByTestId('groupSelector');
  }

  createGroupButton() {
    return this.page.getByTestId('submit-category-btn');
  }

  getTriggerId() {
    return this.page.getByTestId('trigger-id');
  }
}
