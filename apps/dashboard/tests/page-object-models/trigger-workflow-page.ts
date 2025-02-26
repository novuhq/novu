import { type Locator, type Page } from '@playwright/test';

export class TriggerWorkflowPage {
  constructor(private page: Page) {}

  async triggerWorkflowBtnClick(): Promise<void> {
    const triggerWorkflowBtn = await this.page.getByRole('button', { name: 'Test workflow' });
    await triggerWorkflowBtn.click();
  }

  async getActivityPanel(): Promise<Locator> {
    return await this.page.getByTestId('activity-panel');
  }
}
