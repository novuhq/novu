import { StepTypeEnum } from '@novu/shared';
import { expect, type Page } from '@playwright/test';

export class WorkflowEditorPage {
  constructor(private page: Page) {}

  async updateWorkflowName(workflowName: string): Promise<void> {
    const workflowNameInput = this.page.locator('input[name="name"]');
    await workflowNameInput.fill(workflowName);
    await workflowNameInput.press('Tab');
  }

  async addStepAsFirst(stepType: StepTypeEnum): Promise<void> {
    const addStepMenuBtn = this.page.getByTestId('add-step-menu-button').first();
    await expect(addStepMenuBtn).toBeVisible();
    await addStepMenuBtn.click();

    const inAppMenuItem = this.page.getByTestId(`add-step-menu-item-${stepType}`);
    await expect(inAppMenuItem).toBeVisible();
    await inAppMenuItem.click({ force: true });
  }

  async addStepAsLast(stepType: StepTypeEnum): Promise<void> {
    const addStepMenuBtn = this.page.getByTestId('add-step-menu-button').last();
    await expect(addStepMenuBtn).toBeVisible();
    await addStepMenuBtn.click();

    const inAppMenuItem = this.page.getByTestId(`add-step-menu-item-${stepType}`);
    await expect(inAppMenuItem).toBeVisible();
    await inAppMenuItem.click({ force: true });
  }

  async clickLastStep(stepType: StepTypeEnum): Promise<void> {
    const step = this.page.getByTestId(`${stepType}-node`).last();
    await expect(step).toBeVisible();
    await step.click();
  }

  async clickFirstStep(stepType: StepTypeEnum): Promise<void> {
    const step = this.page.getByTestId(`${stepType}-node`).first();
    await expect(step).toBeVisible();
    await step.click();
  }

  async clickWorkflowsBreadcrumb(): Promise<void> {
    const workflowsLink = this.page.getByRole('link').filter({ hasText: 'Workflows' });
    await expect(workflowsLink).toBeVisible();
    await workflowsLink.click();
  }

  async triggerTabClick(): Promise<void> {
    const triggerTab = this.page.getByRole('tab').filter({ hasText: 'Trigger' });
    await expect(triggerTab).toBeVisible();
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

  getSteps(stepType: StepTypeEnum) {
    return this.page.getByTestId(`${stepType}-node`);
  }

  getLastStep(stepType: StepTypeEnum) {
    return this.page.getByTestId(`${stepType}-node`).last();
  }
}
