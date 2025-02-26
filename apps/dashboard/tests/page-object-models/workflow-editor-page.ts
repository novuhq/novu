import { type Page } from '@playwright/test';
import { StepTypeEnum } from '@novu/shared';

export class WorkflowEditorPage {
  constructor(private page: Page) {}

  async updateWorkflowName(workflowName: string): Promise<void> {
    const workflowNameInput = await this.page.locator('input[name="name"]');
    await workflowNameInput.fill(workflowName);
    await workflowNameInput.blur();
    // await workflow name to be updated
    await this.page.waitForResponse('**/v2/workflows/**');
  }

  async addStepAsLast(stepType: StepTypeEnum): Promise<void> {
    const addStepMenuBtn = await this.page.getByTestId('add-step-menu-button').last();
    await addStepMenuBtn.click();

    const inAppMenuItem = await this.page.getByTestId(`add-step-menu-item-${stepType}`);
    await inAppMenuItem.click({ force: true });

    // await for the workflow steps to be updated
    await this.page.waitForResponse('**/v2/workflows/**');
  }

  async clickLastStep(stepType: StepTypeEnum): Promise<void> {
    const step = await this.page.getByTestId(`${stepType}-node`).last();
    await step.click();
  }

  async clickWorkflowsBreadcrumb(): Promise<void> {
    const workflowsLink = await this.page.getByRole('link').filter({ hasText: 'Workflows' });
    await workflowsLink.click();
  }

  async triggerTabClick(): Promise<void> {
    const triggerTab = await this.page.getByRole('tab').filter({ hasText: 'Trigger' });
    await triggerTab.click();
  }

  async getWorkflowFormValues() {
    const workflowNameInput = await this.page.locator('input[name="name"]');
    const workflowIdInput = await this.page.locator('input[name="workflowId"]');
    const tagBadges = await this.page.getByTestId('tags-badge-value');
    const descriptionTextArea = await this.page.locator('textarea[name="description"]');

    return {
      nameValue: await workflowNameInput.inputValue(),
      idValue: await workflowIdInput.inputValue(),
      tagBadges,
      descriptionValue: await descriptionTextArea.inputValue(),
    };
  }

  async getStepCount(stepType: StepTypeEnum) {
    return await this.page.getByTestId(`${stepType}-node`).count();
  }

  async getLastStep(stepType: StepTypeEnum) {
    return await this.page.getByTestId(`${stepType}-node`).last();
  }
}
