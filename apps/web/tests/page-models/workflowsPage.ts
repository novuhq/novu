import { expect, Locator, Page } from '@playwright/test';
import { TemplateStoreModal } from './templateStoreModal';
import { WorkflowEditorPage } from './workflowEditorPage';

export class WorkflowsPage {
  async getFirstWorkflowEditor(): Promise<WorkflowEditorPage> {
    const workflowsTable = this.getWorkflowsTable();
    await workflowsTable.locator('tbody tr').first().click();
    return new WorkflowEditorPage(this.page);
  }
  private templateStoreModal: TemplateStoreModal;

  constructor(private page: Page) {
    this.templateStoreModal = new TemplateStoreModal(page);
  }

  static async goTo(page: Page): Promise<WorkflowsPage> {
    await page.goto('/workflows');
    return new WorkflowsPage(page);
  }
  async clickTemplateEditLink(triggerId: string) {
    const locator = await this.templateEditLink(triggerId);
    await locator.click();
    return new WorkflowEditorPage(this.page);
  }
  async templateEditLink(triggerId: string) {
    let locators = this.page.getByTestId('template-edit-link');
    await expect(locators.first()).toBeVisible();
    let count = await locators.count();
    for (let i = 0; i < count; i++) {
      let href = await locators.nth(i).getAttribute('href');
      console.log('triggerId: ' + JSON.stringify(triggerId));
      console.log('href: ' + href);
      console.log('locator: ' + JSON.stringify(locators.nth(i)));
      if (href.includes(triggerId)) {
        return locators.nth(i);
      }
    }
  }
  getTemplateStoreModal() {
    return this.templateStoreModal;
  }

  getCreateWorkflowButton() {
    return this.page.getByTestId('create-workflow-btn');
  }

  getCreateWorkflowDropdown() {
    return this.page.getByTestId('create-workflow-dropdown');
  }

  getCreateBlankWorkflowButton() {
    return this.page.getByTestId('create-workflow-blank');
  }

  getCreateAllTemplatesWorkflowButton() {
    return this.page.getByTestId('create-workflow-all-templates');
  }

  getCreateTemplateDropdownItem() {
    return this.page.getByTestId('create-template-dropdown-item');
  }

  getWorkflowsTable() {
    return this.page.getByTestId('notifications-template');
  }

  getRowEditLink(row: Locator) {
    return row.getByTestId('template-edit-link').getAttribute('href');
  }

  getStatusLabelTestId(active: boolean) {
    return active ? 'active-status-label' : 'disabled-status-label';
  }

  getNoWorkflowsPlaceholder() {
    return this.page.getByTestId('no-workflow-templates-placeholder');
  }

  getNoWorkflowsMatchesPlaceholder() {
    return this.page.getByTestId('workflows-no-matches');
  }

  getCreateWorkflowTile() {
    return this.page.getByTestId('create-workflow-tile');
  }

  getAllWorkflowTile() {
    return this.page.getByTestId('all-workflow-tile');
  }

  getPopularWorkflowTile() {
    return this.page.getByTestId('popular-workflow-tile');
  }

  getWorkflowName(row: Locator) {
    return row.getByTestId('workflow-row-name').textContent();
  }

  getWorkflowTriggerIdentifier(row: Locator) {
    return row.getByTestId('workflow-row-trigger-identifier').textContent();
  }

  assertRowStatusLabel(row: Locator, active: boolean) {
    return expect(row.getByTestId(this.getStatusLabelTestId(active))).toBeVisible();
  }

  assertRowCategoryLabel(row: Locator, category: string) {
    return expect(row.getByTestId('category-label')).toContainText(category);
  }

  async searchWorkflow(search: string) {
    await this.page.getByTestId('workflows-search-input').fill(search);
    await this.page.waitForResponse('**/v1/notification-templates*');
  }

  async clearSearchInput() {
    return this.page.getByTestId('search-input-clear').click();
  }
}
