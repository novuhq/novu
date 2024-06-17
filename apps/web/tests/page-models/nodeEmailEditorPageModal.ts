import { expect } from '@playwright/test';
import { fillTextInAMonacoEditor } from '../utils/browser';
import { ConditionsPage } from './conditionsPage';
import { VariantPreviewModalPage } from './variantPreviewModalPage';
import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';

export class NodeEmailEditorPageModal extends WorkflowBaseSidePanelPage {
  async assertEmailContentFirstParagraphContains(emailParagraph: string) {
    expect(await (await this.getEditableTextContentByIndex(0)).innerText()).toContain(emailParagraph);
  }
  async assertEmailSubjectContains(emailSubject: string) {
    expect(await this.getEmailSubjectInput().inputValue()).toContain(emailSubject);
  }
  async updateEmailData(emailSubjectVariant: string, emailParagraphVariant: string) {
    await this.fillEmailSubject(emailSubjectVariant);
    await this.editEmailBodyTextParagraph(emailParagraphVariant);
    await this.nodeSettingsUpdateButton().click();
    await this.closeSidePanel();

    return new VariantPreviewModalPage(this.page);
  }

  async clickSettingsRowButton(instance = 0) {
    const locators = await this.getAllRowSettingsLocators();
    await locators[instance].dispatchEvent('click');
  }

  getMonacoEditor() {
    return this.page.locator('.monaco-editor');
  }

  async fillEmailCustomCodeBody(emailBody: string) {
    await fillTextInAMonacoEditor(this.page, '.monaco-editor', emailBody);
  }

  public async getAllRowSettingsLocators() {
    return await this.page.getByTestId('settings-row-btn').all();
  }

  async clickRemoveRowButton() {
    await this.page.getByTestId('remove-row-btn').click();
  }

  getAddConditionsAction() {
    return this.page.getByTestId('add-conditions-action');
  }

  async openAddConditionsSidebar() {
    await this.page.getByTestId('add-conditions-action').click();

    return new ConditionsPage(this.page);
  }

  async fillEmailSubject(EMAIL_SUBJECT: string) {
    await this.getEmailSubjectInput().fill(EMAIL_SUBJECT);
  }

  getCustomCodeEditorType() {
    return this.page.getByTestId('editor-type-selector').getByRole('tab', { name: 'Custom Code' });
  }

  emailSubject() {
    return this.page.getByTestId('emailSubject');
  }

  emailPreheader() {
    return this.page.getByTestId('emailPreheader');
  }

  editableTextContent() {
    return this.page.getByTestId('editable-text-content');
  }

  public getEmailSubjectInput() {
    return this.page.getByTestId('emailSubject');
  }

  async fillEmailPreheader(EMAIL_PREHEADER: string) {
    await this.page.getByTestId('emailPreheader').fill(EMAIL_PREHEADER);
  }

  getSystemVariablesButton() {
    return this.page.getByTestId('var-label').getByText('System Variables');
  }

  getTranslationVariablesButton() {
    return this.page.getByTestId('var-label').getByText('Translation Variables');
  }

  getItemFirstName() {
    return this.page.getByRole('button', { name: 'firstNamestring' });
  }

  getItemCustomVariable() {
    return this.page.getByTestId('var-item-customVariable-string');
  }

  getVarItemStep() {
    return this.page.getByTestId('var-items-step');
  }

  getVarItemsBranding() {
    return this.page.getByTestId('var-items-branding');
  }

  getVarItemsSubscriber() {
    return this.page.getByTestId('var-items-subscriber');
  }

  async clickEmailEditor() {
    await this.page.getByTestId('email-editor').click();

    return new NodeEmailEditorPageModal(this.page);
  }

  async clickAddElementToEmailPlusSign() {
    await this.page.getByTestId('control-add').click();
  }

  async clickAddBtnBlock() {
    await this.page.getByTestId('add-btn-block').click();
  }

  getButtonBlockWrapperLocator() {
    return this.page.getByTestId('button-block-wrapper').locator('button');
  }

  async editButtonText(EXAMPLE_TEXT: string) {
    await this.page.getByTestId('button-text-input').fill(EXAMPLE_TEXT);
  }

  async editEmailBodyTextParagraph(TEST_TEXT: string, instance = 0) {
    const locator = await this.getEditableTextContentByIndex(instance);
    await locator.fill(TEST_TEXT);
    await locator.focus();
    await this.page.keyboard.press('Enter');
  }

  public async getEditableTextContentByIndex(instance: number) {
    const locators = await this.page.getByTestId('editable-text-content').all();

    return locators[instance];
  }

  async clickAddTextBlock() {
    await this.page.getByTestId('add-text-block').click();
  }

  getEditorRow() {
    return this.page.getByTestId('editor-row');
  }

  getUploadImageButton() {
    return this.page.getByTestId('upload-image-button');
  }

  getBrandLogo() {
    return this.page.getByTestId('brand-logo');
  }

  getAlignRightButton() {
    return this.page.getByTestId('align-right-btn');
  }
}
