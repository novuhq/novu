import { expect } from '@playwright/test';
import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';
import { fillTextInAMonacoEditor } from '../utils/browser';
import { VariantPreviewModalPage } from './variantPreviewModalPage';

export class NodeChatEditingModalPageModel extends WorkflowBaseSidePanelPage {
  async updateChatData(chatBodyVariant: string) {
    await this.fillChatBody(chatBodyVariant);
    await this.nodeSettingsUpdateButton().click();
    await this.closeSidePanel();

    return new VariantPreviewModalPage(this.page);
  }
  async assertBodyContains(chatBody: string) {
    await expect(this.getMonacoEditor()).toContainText(chatBody);
  }

  async fillChatBody(chatBody: string) {
    await fillTextInAMonacoEditor(this.page, '.monaco-editor', chatBody);
  }

  getMonacoEditor() {
    return this.page.locator('.monaco-editor');
  }
}
