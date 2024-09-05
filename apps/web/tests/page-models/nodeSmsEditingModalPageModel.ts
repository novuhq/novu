import { expect } from '@playwright/test';
import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';
import { fillTextInAMonacoEditor } from '../utils/browser';
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
