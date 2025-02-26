import { type Page } from '@playwright/test';
import { StepTypeEnum } from '@novu/shared';

export class WorkflowEditorPage {
  constructor(private page: Page) {}

  async updateWorkflowName(workflowName: string): Promise<void> {
    const workflowNameInput = this.page.locator('input[name="name"]');
    await workflowNameInput.fill(workflowName);
    await workflowNameInput.blur();
    // await workflow name to be updated
    await this.page.waitForResponse('**/v2/workflows/**');
  }

  async addStepAsFirst(stepType: StepTypeEnum): Promise<void> {
    const addStepMenuBtn = this.page.getByTestId('add-step-menu-button').first();
    await addStepMenuBtn.click();

    const inAppMenuItem = this.page.getByTestId(`add-step-menu-item-${stepType}`);
    await inAppMenuItem.click();

    // await for the workflow steps to be updated
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/v2/workflows/') && resp.request().method() === 'PUT' && resp.status() === 200
    );
  }

  async addStepAsLast(stepType: StepTypeEnum): Promise<void> {
    const addStepMenuBtn = this.page.getByTestId('add-step-menu-button').last();
    await addStepMenuBtn.click();

    const inAppMenuItem = this.page.getByTestId(`add-step-menu-item-${stepType}`);
    await inAppMenuItem.click();

    // await for the workflow steps to be updated
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/v2/workflows/') && resp.request().method() === 'PUT' && resp.status() === 200
    );
  }

  async clickLastStep(stepType: StepTypeEnum): Promise<void> {
    const step = this.page.getByTestId(`${stepType}-node`).last();
    await step.click();
  }

  async clickFirstStep(stepType: StepTypeEnum): Promise<void> {
    const step = this.page.getByTestId(`${stepType}-node`).first();
    await step.click();
  }

  async clickWorkflowsBreadcrumb(): Promise<void> {
    const workflowsLink = this.page.getByRole('link').filter({ hasText: 'Workflows' });
    await workflowsLink.click();
  }

  async triggerTabClick(): Promise<void> {
    const triggerTab = this.page.getByRole('tab').filter({ hasText: 'Trigger' });
    await triggerTab.click();
  }

  async getWorkflowFormValues() {
    const workflowNameInput = this.page.locator('input[name="name"]');
    const workflowIdInput = this.page.locator('input[name="workflowId"]');
    const tagBadges = this.page.getByTestId('tags-badge-value');
    const descriptionTextArea = this.page.locator('textarea[name="description"]');

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
    return this.page.getByTestId(`${stepType}-node`).last();
  }
}
