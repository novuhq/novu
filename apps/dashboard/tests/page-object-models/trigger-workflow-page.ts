import { expect, type Locator, type Page } from '@playwright/test';

export class TriggerWorkflowPage {
  constructor(private page: Page) {}

  async triggerWorkflowBtnClick(): Promise<void> {
    const triggerWorkflowBtn = this.page.getByRole('button', { name: 'Test workflow' });
    await expect(triggerWorkflowBtn).toBeVisible();
    await triggerWorkflowBtn.click();
  }

  getActivityPanelSkeleton(): Locator {
    return this.page.getByTestId('activity-panel-skeleton');
  }

  getActivityPanel(): Locator {
    return this.page.getByTestId('activity-panel');
  }
}
