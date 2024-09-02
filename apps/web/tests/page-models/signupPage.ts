import { UserEntity } from '@novu/dal';
import { Page, selectors } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { JobTitleEnum, jobTitleToLabelMapper } from '@novu/shared';

export interface SignUpTestData extends Partial<UserEntity> {
  fullName?: string;
}

export class SignUpPage {
  static async goTo(
    page: Page,
    { token, redirectURL }: { token?: string; redirectURL?: string } = {}
  ): Promise<SignUpPage> {
    const searchParams = new URLSearchParams();

    if (redirectURL) {
      searchParams.append('redirect_url', redirectURL);
    }

    if (token) {
      searchParams.append('token', token);
    }

    await page.goto(`/auth/signup?${searchParams.toString()}`);

    return new SignUpPage(page);
  }

  constructor(private page: Page) {
    selectors.setTestIdAttribute('data-test-id');
  }
  public getPasswordFromUserOrGenerate() {
    return faker.internet.password(20, true, /[A-Za-z0-9]/, 'Admin!234');
  }

  public getNameFromUserOrGenerate(data: Partial<UserEntity> & { fullName?: string }) {
    return data?.fullName ?? `${faker.name.firstName()} ${faker.name.lastName()}`;
  }

  public async assertNavigationPath(path: string) {
    selectors.setTestIdAttribute('data-test-id');
    await this.page.waitForURL(path);
  }

  public async clickGetStartedButton() {
    await this.page.getByTestId('submit-btn').click();
  }

  public async chooseMultiChannelUseCase() {
    await this.page.getByTestId('check-box-container-multi_channel').click();
  }

  public async setCompanyNameTo(name: string) {
    await this.page.getByTestId('questionnaire-company-name').fill(name);
  }

  public async selectJobTitle(jobTitle: string) {
    await this.page.getByTestId('questionnaire-job-title').click();
    await this.clickElementByText(jobTitle);
  }
  public async clickElementByText(text: string) {
    await this.page.getByText(text).click();
  }
  public getAcceptTermsAndConditionsCheckMark() {
    return this.page.getByTestId('accept-cb');
  }

  public async clickSignUpButton() {
    await this.page.getByTestId('submitButton').click();
  }

  public async fillSignUpData(data?: SignUpTestData) {
    await this.getFullNameLocator().fill(this.getNameFromUserOrGenerate(data));
    await this.getEmailInputLocator().fill(SignUpPage.fakeEmailFromUserOrGenerate(data));
    await this.getPasswordLocator().fill(this.getPasswordFromUserOrGenerate());
    await this.getPasswordLocator().blur();
    await this.getAcceptTermsAndConditionsCheckMark().setChecked(true);
  }

  public getPasswordLocator() {
    return this.page.getByTestId('password');
  }

  public getEmailInputLocator() {
    return this.page.getByTestId('email');
  }

  public getFullNameLocator() {
    return this.page.getByTestId('fullName');
  }

  public static fakeEmailFromUserOrGenerate(data: Partial<UserEntity> & { fullName?: string }) {
    return data?.email ?? faker.internet.email();
  }

  public async fillUseCaseData() {
    await this.selectJobTitle(jobTitleToLabelMapper[JobTitleEnum.PRODUCT_MANAGER]);
    await this.setCompanyNameTo('Company Name');
    await this.chooseLanguageSelector();
  }

  public async chooseLanguageSelector() {
    await this.page.getByTestId('language-checkbox').getByText('PHP').click();
  }
}
