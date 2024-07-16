import { Page } from '@playwright/test';
import { getAttByTestId } from '../utils/browser';
import { SettingsMenuPage } from './settingsMenuPage';

export enum Environment {
  Development = 'Development',
  Production = 'Production',
}

export class SidebarPage {
  constructor(private page: Page) {}

  public getTemplatesLink() {
    return this.page.getByTestId('side-nav-templates-link');
  }

  public getOrganizationSwitch() {
    return this.page.getByTestId('organization-switch');
  }

  public getEnvironmentSwitch() {
    return this.page.getByTestId('environment-switch');
  }

  public async toggleToProduction() {
    await this.getEnvironmentSwitch().click();
    await this.page.getByRole('option', { name: Environment.Production }).click();
  }

  public async toggleToDevelopment() {
    await this.getEnvironmentSwitch().click();
    await this.page.getByRole('option', { name: Environment.Development }).click();
  }

  public async getSupportLink() {
    return await getAttByTestId(this.page, 'side-nav-bottom-link-support', 'href');
  }

  public async getDocumentationLink() {
    return await getAttByTestId(this.page, 'side-nav-bottom-link-documentation', 'href');
  }

  public async getShareFeedbackLink() {
    return await getAttByTestId(this.page, 'side-nav-bottom-link-share-feedback', 'href');
  }

  public getSettingsLink() {
    return this.page.getByTestId('side-nav-settings-link');
  }

  public async getSettingsLinkHref() {
    return await getAttByTestId(this.page, 'side-nav-settings-link', 'href');
  }

  public getQuickStartLingLocator() {
    return this.page.getByTestId('side-nav-quickstart-link');
  }

  public getIntegrationLinkLocator() {
    return this.page.getByTestId('side-nav-integrations-link');
  }

  public getSettingsLinkLocator() {
    return this.page.getByTestId('side-nav-settings-link');
  }

  public getTemplatesLinkLocator() {
    return this.page.getByTestId('side-nav-templates-link');
  }

  public getActivitiesLinkLocator() {
    return this.page.getByTestId('side-nav-activities-link');
  }

  public getChangesLinkLocator() {
    return this.page.getByTestId('side-nav-changes-link');
  }

  public getChangesCount() {
    return this.page.getByTestId('side-nav-changes-count');
  }

  public getSubscribersLinkLocator() {
    return this.page.getByTestId('side-nav-subscribers-link');
  }

  public getTenantsLinkLocator() {
    return this.page.getByTestId('side-nav-tenants-link');
  }

  public getTranslationsLinkLocator() {
    return this.page.getByTestId('side-nav-translations-link');
  }

  static async goTo(page: Page) {
    return new SidebarPage(page);
  }
  public getUserProfileLocator() {
    return this.page.getByTestId('side-nav-settings-user-profile');
  }

  public getOrganizationLinkLocator() {
    return this.page.getByTestId('side-nav-settings-organization-link');
  }

  public getSecurityLinkLocator() {
    return this.page.getByTestId('side-nav-settings-security-link');
  }

  public getTeamLinkLocator() {
    return this.page.getByTestId('side-nav-settings-team-link');
  }

  public getBillingLinkLocator() {
    return this.page.getByTestId('side-nav-settings-billing-link');
  }

  public getApiKeysLocator() {
    return this.page.getByTestId('side-nav-settings-api-keys');
  }

  public getInboundWebhookLocator() {
    return this.page.getByTestId('side-nav-settings-inbound-webhook');
  }

  async clickSettings() {
    await this.getSettingsLinkLocator().click();

    return new SettingsMenuPage(this.page);
  }
}
