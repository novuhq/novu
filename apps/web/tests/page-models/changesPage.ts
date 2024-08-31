import { Page } from '@playwright/test';

export class ChangesPage {
  constructor(private page: Page) {}

  static async goTo(page: Page): Promise<ChangesPage> {
    await page.goto('/changes');

    return new ChangesPage(page);
  }

  getChangesTable() {
    return this.page.getByTestId('pending-changes-table');
  }

  getHistoryChangesTable() {
    return this.page.getByTestId('history-changes-table');
  }

  getChangesTableRows() {
    return this.getChangesTable().locator('tbody tr');
  }

  getHistoryChangesTableRows() {
    return this.getHistoryChangesTable().locator('tbody tr');
  }

  switchToTab(tabName: string) {
    return this.page.getByRole('tab', { name: tabName }).click();
  }

  getPromoteButton(name?: string) {
    if (name) {
      return this.page.getByRole('row', { name }).getByTestId('promote-btn');
    }

    return this.page.getByTestId('promote-btn').first();
  }

  getPromoteAllButton() {
    return this.page.getByTestId('promote-all-btn');
  }

  getChangeType(name?: string) {
    if (name) {
      return this.page.getByRole('row', { name }).getByTestId('change-type');
    }

    return this.page.getByTestId('change-type');
  }

  getChangeContent(name?: string) {
    if (name) {
      return this.page.getByRole('row', { name }).getByTestId('change-content');
    }

    return this.page.getByTestId('change-content');
  }
}
