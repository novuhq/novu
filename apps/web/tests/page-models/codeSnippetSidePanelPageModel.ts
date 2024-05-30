import { Page } from '@playwright/test';

export enum SNIPPET_TAB {
  CURL = 'Curl',
}

export class CodeSnippetSidePanelPageModel {
  constructor(private page: Page) {}

  getTriggerCodeSnippet() {
    return this.page.getByTestId('trigger-code-snippet');
  }

  async changeSnippetTabTo(tab: SNIPPET_TAB) {
    await this.page.locator('.mantine-Tabs-tabsList').getByText(tab).click();
  }

  async getCurlSnippet() {
    return await this.page.getByTestId('trigger-curl-snippet').textContent();
  }
}
