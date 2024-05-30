import { Page, Route } from '@playwright/test';
import { FeatureFlagsKeysEnum } from '@novu/shared';

export class FeatureFlagsMock {
  private flagsToMock: Partial<Record<FeatureFlagsKeysEnum, boolean>> = {};
  constructor(page: Page) {
    this.flagsToMock = {};
    // noinspection JSIgnoredPromiseFromCall
    this.mockFeatureFlags(page);
  }
  private async mockFeatureFlags(page: Page) {
    await this.mockClientStream(page);
    await this.mockEvents(page);
    await this.mockApp(page);
  }
  public setFlagsToMock(flagsToMock: Partial<Record<FeatureFlagsKeysEnum, boolean>>) {
    this.flagsToMock = flagsToMock;
  }
  private async mockApp(page: Page) {
    await page.route('**/app.launchdarkly.com/**', (route: Route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(this.getResponseBody()),
        contentType: 'application/json',
      });
    });
  }
  private async mockEvents(page: Page) {
    await page.route('**/events.launchdarkly.com/**', (route: Route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({}),
        contentType: 'application/json',
      });
    });
  }
  private async mockClientStream(page: Page) {
    await page.route('**/clientstream.launchdarkly.com/**', (route: Route) => {
      route.fulfill({
        status: 200,
        body: 'data: no streaming feature flag data here\n\n',
        contentType: 'text/event-stream; charset=utf-8',
      });
    });
  }

  getResponseBody() {
    const responseBody = {};
    if (Object.keys(this.flagsToMock).length === 0) {
      responseBody['PLACE_HOLDER_FF'] = { value: 'false' };
      return responseBody;
    }
    Object.entries(this.flagsToMock).forEach(([featureFlagName, featureFlagValue]) => {
      responseBody[featureFlagName] = { value: featureFlagValue };
    });
    return responseBody;
  }
}
