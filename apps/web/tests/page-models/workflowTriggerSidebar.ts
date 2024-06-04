import { Page } from '@playwright/test';

export class WorkflowTriggerSidebar {
  constructor(private page: Page) {}

  locator() {
    return this.page.getByTestId('workflow-sidebar');
  }

  getTestTriggerToParam() {
    return this.page.getByTestId('test-trigger-to-param');
  }

  getTestTriggerPayloadParam() {
    return this.page.getByTestId('test-trigger-payload-param');
  }

  getTestTriggerBtn() {
    return this.page.getByTestId('test-trigger-btn');
  }
}
