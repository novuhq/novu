import { Page, selectors } from '@playwright/test';
import { setBrowserDateTimeTo } from '../utils/browser';

export class LoginData {
  email: string;
  password: string;
}

export class AuthLoginPage {
  public async passAuthTokenExpirationTime() {
    // setting current time in future, to simulate expired token
    const ONE_MINUTE = 1000 * 60; // adding 1 minute to be sure that token is expired
    const THIRTY_DAYS = ONE_MINUTE * 60 * 24 * 30; // iat - exp = 30 days
    const fakeNow = new Date(Date.now() + THIRTY_DAYS + ONE_MINUTE);

    await setBrowserDateTimeTo(this.page, fakeNow);
  }
  constructor(private page: Page) {
    selectors.setTestIdAttribute('data-test-id');
  }

  public async assertNavigationPath(path: string) {
    await this.page.waitForURL(path);
  }

  static async goTo(
    page: Page,
    { token, redirectURL }: { token?: string; redirectURL?: string } = {}
  ): Promise<AuthLoginPage> {
    const searchParams = new URLSearchParams();

    if (redirectURL) {
      searchParams.append('redirect_url', redirectURL);
    }

    if (token) {
      searchParams.append('token', token);
    }

    await page.goto(`/auth/login?${searchParams.toString()}`);

    return new AuthLoginPage(page);
  }

  public async submitLoginToken(token: string) {
    await this.page.goto(`auth/login?token=${token}`);
  }

  public getEmailLocator() {
    return this.page.getByTestId('email');
  }

  public async setEmailTo(value: string) {
    await this.page.getByTestId('email').fill(value);
  }

  public async setPasswordTo(value: string) {
    await this.page.getByTestId('password').fill(value);
  }

  public async clickSignInButton() {
    await this.page.getByTestId('submit-btn').click();
  }

  public async fillLoginForm(loginData: LoginData) {
    await this.setEmailTo(loginData.email);
    await this.setPasswordTo(loginData.password);
  }
}
