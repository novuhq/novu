import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';
import { Page, expect } from '@playwright/test';
import { fillTextInAMonacoEditor } from '../utils.ts/browser';
import { VariantPreviewModalPage } from './variantPreviewModalPage';

export class NodeSmsEditingModalPageModel extends WorkflowBaseSidePanelPage {
  async updateSmsData(smsBody: string) {
    await this.fillSmsBody(smsBody);
    await this.nodeSettingsUpdateButton().click();
    await this.closeSidePanel();
    return new VariantPreviewModalPage(this.page);
  }
  async assertBodyContains(smsBody: string) {
    await expect(this.getMonacoEditor()).toContainText(smsBody);
  }
  constructor(page: Page) {
    super(page);
  }

  async fillSmsBody(smsBody: string) {
    await fillTextInAMonacoEditor(this.page, '.monaco-editor', smsBody);
  }

  getMonacoEditor() {
    return this.page.locator('.monaco-editor');
  }

  getOpenVariableManagementLocator() {
    return this.page.getByTestId('open-variable-management');
  }
}
