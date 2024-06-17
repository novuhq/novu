import { expect } from '@playwright/test';
import { fillTextInAMonacoEditorLocator } from '../utils/browser';
import { VariantPreviewModalPage } from './variantPreviewModalPage';
import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';

export class NodePushEditorPageModal extends WorkflowBaseSidePanelPage {
  async updatePushData(pushSubjectVariant: string, pushBodyVariant: string) {
    await this.fillPushTitle(pushSubjectVariant);
    await this.fillPushContent(pushBodyVariant);
    await this.nodeSettingsUpdateButton().click();
    await this.closeSidePanel();

    return new VariantPreviewModalPage(this.page);
  }
  async assertPushBodyContains(pushBody: string) {
    await expect(this.getPushContentEditorLocator()).toContainText(pushBody);
  }
  async assertPushSubjectContains(pushSubject: string) {
    await expect(this.getPushTitleEditorLocator()).toContainText(pushSubject);
  }
  public getPushTitleEditorLocator() {
    return this.page.getByTestId('push-title-container').locator('.monaco-editor').nth(0);
  }

  public getPushContentEditorLocator() {
    return this.page.getByTestId('push-content-container').locator('.monaco-editor').nth(0);
  }

  public async fillPushTitle(titleText: string) {
    await fillTextInAMonacoEditorLocator(this.getPushTitleEditorLocator(), titleText);
  }

  public async fillPushContent(contentText: string) {
    await fillTextInAMonacoEditorLocator(this.getPushContentEditorLocator(), contentText);
  }
}
