import { Page, expect } from '@playwright/test';

export enum Tab {
  IN_APP = 'In-app',
  MULTI_CHANNEL = 'Multi-channel',
  DIGEST = 'Digest',
  DELAY = 'Delay',
  TRANSLATE = 'Translate',
}

interface ITabLinkInfo {
  label: string;
  type: 'button' | 'link';
  urlRegex: RegExp;
}

interface ITabTest {
  name: Tab;
  title: string;
  steps: number;
  links: ITabLinkInfo[];
}

const TabConfigs: Record<Tab, ITabTest> = {
  [Tab.IN_APP]: {
    name: Tab.IN_APP,
    title: 'In-app notifications',
    steps: 4,
    links: [
      { label: 'Create In-app provider', type: 'link', urlRegex: /\/integrations\/[A-Z0-9]+/i },
      { label: 'Customize', type: 'button', urlRegex: /\/workflows\/edit\/\w+/ },
      { label: 'Test the trigger', type: 'button', urlRegex: /\/workflows\/edit\/\w+\/test-workflow/ },
      { label: 'activity feed', type: 'link', urlRegex: /\/activities/ },
    ],
  },
  [Tab.MULTI_CHANNEL]: {
    name: Tab.MULTI_CHANNEL,
    title: 'Multi-channel notifications',
    steps: 4,
    links: [
      { label: 'Integration store', type: 'link', urlRegex: /\/integrations\/create/ },
      { label: 'Customize', type: 'button', urlRegex: /\/workflows\/edit\/\w+/ },
      { label: 'Test the trigger', type: 'button', urlRegex: /\/workflows\/edit\/\w+\/test-workflow/ },
      { label: 'activity feed', type: 'link', urlRegex: /\/activities/ },
    ],
  },
  [Tab.DIGEST]: {
    name: Tab.DIGEST,
    title: 'Digest multiple events',
    steps: 5,
    links: [
      { label: 'Integration store', type: 'link', urlRegex: /\/integrations\/create/ },
      { label: 'Customize', type: 'button', urlRegex: /\/workflows\/edit\/\w+/ },
      { label: 'Customize digest node', type: 'button', urlRegex: /\/workflows\/edit\/\w+\/digest\/\w+/ },
      { label: 'Test the trigger', type: 'button', urlRegex: /\/workflows\/edit\/\w+\/test-workflow/ },
      { label: 'activity feed', type: 'link', urlRegex: /\/activities/ },
    ],
  },
  [Tab.DELAY]: {
    name: Tab.DELAY,
    title: 'Delay step execution',
    steps: 5,
    links: [
      { label: 'Integration store', type: 'link', urlRegex: /\/integrations\/create/ },
      { label: 'Customize', type: 'button', urlRegex: /\/workflows\/edit\/\w+/ },
      { label: 'Customize delay', type: 'button', urlRegex: /\/workflows\/edit\/\w+\/delay\/\w+/ },
      { label: 'Test the trigger', type: 'button', urlRegex: /\/workflows\/edit\/\w+\/test-workflow/ },
      { label: 'activity feed', type: 'link', urlRegex: /\/activities/ },
    ],
  },
  [Tab.TRANSLATE]: {
    name: Tab.TRANSLATE,
    title: 'Translate content',
    steps: 4,
    links: [
      { label: 'Integration store', type: 'link', urlRegex: /\/integrations\/create/ },
      { label: 'Translations page', type: 'link', urlRegex: /\/translations/ },
    ],
  },
};

export class GetStartedPage {
  constructor(private page: Page) {}

  static async goTo(page: Page, queryParams: string = ''): Promise<GetStartedPage> {
    await page.goto(`/get-started${queryParams}`);

    return new GetStartedPage(page);
  }

  async clickTab(tab: Tab) {
    await this.page.getByRole('tab', { name: tab }).click();
  }

  async assertGetStartedPageIsVisible() {
    await expect(this.page.getByRole('heading', { name: 'Get started' })).toBeVisible();
    await expect(this.page).toHaveURL(/\/get-started/);
  }

  async assertTabsAreVisible(tabs: Tab[]) {
    for (const tab of tabs) {
      await expect(this.page.getByRole('tab', { name: tab })).toBeVisible();
    }
  }

  async assertTabSelected(tab: Tab) {
    await expect(this.page.getByRole('tab', { name: tab, selected: true })).toBeVisible();
  }

  async ensureLinkWithAttributes(
    label: string,
    type: 'link' | 'button',
    urlRegex: RegExp,
    exact: boolean = true
  ): Promise<void> {
    const link = this.page.getByRole(type, { name: label, exact });
    await expect(link).toBeVisible();

    if (type === 'link') {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', expect.stringMatching(/^(noopener noreferrer|noreferrer noopener)$/));
      await expect(link).toHaveAttribute('href', urlRegex);
    } else if (type === 'button') {
      const [newPage] = await Promise.all([this.page.waitForEvent('popup'), link.click()]);
      await newPage.waitForLoadState();
      expect(newPage.url()).toMatch(urlRegex);
      await newPage.close();
    }
  }

  async assertTabTitle(tabTitle: string) {
    await expect(this.page.getByRole('heading', { name: tabTitle })).toBeVisible();
  }

  async verifyTabContent(tab: Tab) {
    const tabConfig = TabConfigs[tab];

    await this.clickTab(tabConfig.name);
    await this.assertTabSelected(tabConfig.name);
    await this.assertTabTitle(tabConfig.title);

    await this.ensureLinkWithAttributes('Learn about ', 'link', /docs.novu.co/, false);
    await expect(this.page.locator('canvas')).toBeVisible();

    for (let index = 1; index <= tabConfig.steps; index += 1) {
      expect(this.page.getByText(`${index}`, { exact: true })).toBeVisible();
    }

    for (const linkInfo of tabConfig.links) {
      await this.ensureLinkWithAttributes(linkInfo.label, linkInfo.type, linkInfo.urlRegex);
    }
  }
}
