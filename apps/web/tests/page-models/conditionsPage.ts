import { Page } from '@playwright/test';

export class ConditionsPage {
  constructor(private page: Page) {}

  async addNewSubscriberCondition(key: string, operator: string, value: string) {
    await this.getAddNewConditionButton().click();
    await this.selectConditionOnDropdown('Subscriber');
    await this.getConditionsFormKeyInput().fill(key);
    await this.selectConditionOperatorDropdown(operator);
    await this.getConditionsFormValueInput().fill(value);
    await this.getApplyConditionsButton().click();
  }

  async addNewPreviousStepCondition(step: string, type: string) {
    await this.getAddNewConditionButton().click();
    await this.selectConditionOnDropdown('Previous step');
    await this.selectPreviousStepConditionDropdown(step);
    await this.selectPreviousStepTypeDropdown(type);
    await this.getApplyConditionsButton().click();
  }

  async addNewWebhookCondition(webhookUrl: string, key: string, operator: string, value: string) {
    await this.getAddNewConditionButton().click();
    await this.selectConditionOnDropdown('Webhook');
    await this.getWebhookUrlInput().fill(webhookUrl);
    await this.getConditionsFormKeyInput().fill(key);
    await this.selectConditionOperatorDropdown(operator);
    await this.getConditionsFormValueInput().fill(value);
    await this.getApplyConditionsButton().click();
  }

  async addOnlineNowCondition(isOnline: boolean) {
    await this.getAddNewConditionButton().click();
    await this.selectConditionOnDropdown('Is online');
    await this.page.getByTestId('online-now-value-dropdown').click();
    await this.page.getByRole('option', { name: isOnline ? 'Yes' : 'No', exact: true }).click();
    await this.getApplyConditionsButton().click();
  }

  async addLastTimeOnlineCondition(period: string, value: string) {
    await this.getAddNewConditionButton().click();
    await this.selectConditionOnDropdown('Last time was online');
    await this.page.getByTestId('online-in-last-operator-dropdown').click();
    await this.page.getByRole('option', { name: period, exact: true }).click();
    await this.page.getByTestId('online-in-last-value-input').fill(value);
    await this.getApplyConditionsButton().click();
  }

  getAddNewConditionButton() {
    return this.page.getByTestId('add-new-condition');
  }

  getConditionsRowButton() {
    return this.page.getByTestId('conditions-row-btn').last();
  }

  getConditionsRowDeleteButton() {
    return this.page.getByTestId('conditions-row-delete').last();
  }

  getConditionsFormOnDropdown() {
    return this.page.getByTestId('conditions-form-on').last();
  }

  async selectConditionOnDropdown(condition: string) {
    await this.getConditionsFormOnDropdown().click();

    return this.page.getByRole('option', { name: condition, exact: true }).click();
  }

  getConditionsFormOperatorDropdown() {
    return this.page.getByTestId('conditions-form-operator').last();
  }

  getPreviousStepTypeDropdown() {
    return this.page.getByTestId('previous-step-type-dropdown').last();
  }

  getPreviousStepConditionDropdown() {
    return this.page.getByTestId('previous-step-dropdown').last();
  }

  async selectConditionOperatorDropdown(operator: string) {
    await this.getConditionsFormOperatorDropdown().click();

    return this.page.getByRole('option', { name: operator, exact: true }).click();
  }

  async selectPreviousStepConditionDropdown(step: string) {
    await this.getPreviousStepConditionDropdown().click();

    return this.page.getByRole('option', { name: step, exact: true }).click();
  }

  async selectPreviousStepTypeDropdown(type: string) {
    await this.getPreviousStepTypeDropdown().click();

    return this.page.getByRole('option', { name: type, exact: true }).click();
  }

  getConditionsFormKeyInput() {
    return this.page.getByTestId('conditions-form-key').last();
  }

  getWebhookUrlInput() {
    return this.page.getByTestId('webhook-filter-url-input').last();
  }

  getConditionsFormValueInput() {
    return this.page.getByTestId('conditions-form-value').last();
  }

  getApplyConditionsButton() {
    return this.page.getByTestId('apply-conditions-btn');
  }
}
