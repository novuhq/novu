import { type Page } from '@playwright/test';

export class StepConfigSidebar {
  constructor(private page: Page) {}

  async getStepNameInputValue(): Promise<string> {
    const stepNameInput = await this.page.locator(`input[name="name"]`);

    return stepNameInput.inputValue();
  }

  async isStepNameInputDisabled(): Promise<boolean> {
    const stepNameInput = await this.page.locator(`input[name="name"]`);

    return stepNameInput.isDisabled();
  }

  async getStepIdentifierInputValue(): Promise<string> {
    const stepIdentifierInput = await this.page.locator(`input[name="stepId"]`);

    return stepIdentifierInput.inputValue();
  }

  async getStepIdentifierReadonlyAttribute(): Promise<string | null> {
    const stepIdentifierInput = await this.page.locator(`input[name="stepId"]`);

    return stepIdentifierInput.getAttribute('readonly');
  }

  async updateStepName({ oldStepName, newStepName }: { newStepName: string; oldStepName: string }): Promise<void> {
    const stepNameInput = await this.page.locator(`input[value="${oldStepName}"]`);
    await stepNameInput.fill(`${newStepName}`);
    await this.page.locator(`input[value="${newStepName}"]`).blur();

    // await for the step name to be updated
    await this.page.waitForResponse('**/v2/workflows/**');
  }

  async configureTemplateClick(): Promise<void> {
    const configureInAppTemplateBtn = await this.page.getByRole('link').filter({ hasText: /Configure.*/ });
    await configureInAppTemplateBtn.click();
  }

  async delete(): Promise<void> {
    const deleteStep = await this.page.getByRole('button').filter({ hasText: 'Delete step' });
    await deleteStep.click();

    const deleteStepModal = await this.page.getByRole('dialog');
    const deleteConfirm = await deleteStepModal.getByRole('button').filter({ hasText: 'Delete' });
    await deleteConfirm.click({ force: true });

    await this.page.waitForResponse('**/v2/workflows/**');
  }
}
