import { Page, expect } from '@playwright/test';

export class LayoutsPage {
  constructor(private page: Page) {}

  static async goTo(page: Page): Promise<LayoutsPage> {
    await page.goto('/layouts');

    return new LayoutsPage(page);
  }

  async assertIsVisible() {
    await expect(this.page.getByRole('heading', { name: 'Layouts' })).toBeVisible();
    await expect(this.page).toHaveURL(/\/layout/);
  }

  getLayoutsTable() {
    return this.page.getByTestId('layouts-table');
  }

  async assertLayoutsTableHeaders(headerTitles: string[]) {
    const headers = this.getLayoutsTable().locator('th');
    await headers.allTextContents().then((texts) => expect(texts).toEqual(headerTitles));
  }

  async assertLayoutsTableRowCount(count: number) {
    const rows = this.getLayoutsTable().locator('tr');
    await rows.count().then((rowCount) => expect(rowCount - 1).toBe(count));
  }
}
