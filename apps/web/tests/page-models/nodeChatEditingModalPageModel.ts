import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';
import { Page, expect } from '@playwright/test';
import { fillTextInAMonacoEditor } from '../utils.ts/browser';
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
  constructor(page: Page) {
    super(page);
  }

  async fillChatBody(chatBody: string) {
    await fillTextInAMonacoEditor(this.page, '.monaco-editor', chatBody);
  }

  getMonacoEditor() {
    return this.page.locator('.monaco-editor');
  }
}
