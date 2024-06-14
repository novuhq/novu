import { Page } from '@playwright/test';
import { waitForNetworkIdle } from '../utils/browser';

export class BasePage {
  constructor(protected page: Page) {}

  async waitForNetworkIdle() {
    await waitForNetworkIdle(this.page);
  }
}
