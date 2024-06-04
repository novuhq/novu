import { Page } from '@playwright/test';

export class TemplateStoreModal {
  constructor(private page: Page) {}

  locator() {
    return this.page.getByTestId('templates-store-modal');
  }

  getTemplateStoreModalUseTemplate() {
    return this.page.getByTestId('templates-store-modal-use-template');
  }

  getSidebarItems() {
    return this.page.locator('[data-test-id="templates-store-modal-sidebar"] div');
  }

  getWorkflowCanvas() {
    return this.page.locator('.react-flow');
  }

  getBluePrintName(name: string) {
    return this.page.getByTestId('templates-store-modal-blueprint-name').getByText(name);
  }

  getBluePrintDescription() {
    return this.page.getByTestId('templates-store-modal-blueprint-description');
  }

  getBlueprintItem(name: string) {
    return this.page.getByTestId('templates-store-modal-blueprint-item').getByText(name);
  }
}
