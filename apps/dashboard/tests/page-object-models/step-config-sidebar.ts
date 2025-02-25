import { type Page } from '@playwright/test';

export class StepConfigSidebar {
  constructor(private page: Page) {}

  async getStepNameInputValue(): Promise<string> {
    const stepNameInput = this.page.locator(`input[name="name"]`);

    return stepNameInput.inputValue();
  }

  async isStepNameInputDisabled(): Promise<boolean> {
    const stepNameInput = this.page.locator(`input[name="name"]`);

    return stepNameInput.isDisabled();
  }

  async getStepIdentifierInputValue(): Promise<string> {
    const stepIdentifierInput = this.page.locator(`input[name="stepId"]`);

    return stepIdentifierInput.inputValue();
  }

  async getStepIdentifierReadonlyAttribute(): Promise<string | null> {
    const stepIdentifierInput = this.page.locator(`input[name="stepId"]`);

    return stepIdentifierInput.getAttribute('readonly');
  }

  async updateStepName({ oldStepName, newStepName }: { newStepName: string; oldStepName: string }): Promise<void> {
    const stepNameInput = this.page.locator(`input[value="${oldStepName}"]`);
    await stepNameInput.fill(`${newStepName}`);
    await this.page.locator(`input[value="${newStepName}"]`).blur();

    // await for the step name to be updated
    await this.page.waitForResponse('**/v2/workflows/**');
  }

  async configureTemplateClick(): Promise<void> {
    const configureInAppTemplateBtn = this.page.getByRole('link').filter({ hasText: /Configure.* template/ });
    await configureInAppTemplateBtn.click();
  }

  async delete(): Promise<void> {
    const deleteStep = this.page.getByRole('button').filter({ hasText: 'Delete step' });
    await deleteStep.click();

    const deleteStepModal = this.page.getByRole('dialog');
    const deleteConfirm = deleteStepModal.getByRole('button').filter({ hasText: 'Delete' });
    await deleteConfirm.click({ force: true });

    await this.page.waitForResponse('**/v2/workflows/**');
  }

  async setRegularDigestAmountInputValue(value: string): Promise<void> {
    const regularDigestAmountInput = this.page.getByTestId('regular-digest-amount-input');
    await regularDigestAmountInput.fill(value);
  }

  async close(): Promise<void> {
    const closeBtn = this.page.getByTestId('configure-step-form-close');
    await closeBtn.click();
  }
}
