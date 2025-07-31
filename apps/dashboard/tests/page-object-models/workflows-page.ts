import { expect, type Page } from '@playwright/test';

export class WorkflowsPage {
  constructor(private page: Page) {}

  async goTo(): Promise<void> {
    await this.page.goto('/');
  }

  async createWorkflowBtnClick(): Promise<void> {
    await this.page.getByRole('button', { name: 'Create workflow' }).first().click();
  }

  async getWorkflowElement(workflowName: string) {
    return this.page.locator('td').filter({ hasText: workflowName });
  }

  async clickWorkflowName(workflowName: string): Promise<void> {
    const workflow = await this.getWorkflowElement(workflowName);
    await workflow.click();
  }

  async getWorkflowStatusBadge(workflowName: string, status: 'Active' | 'Inactive') {
    const workflowRow = this.page.getByRole('row').filter({ hasText: workflowName });

    return workflowRow.locator('td', { hasText: status });
  }

  async clickWorkflowActionsMenu(workflowName: string): Promise<void> {
    const workflowRow = this.page.getByRole('row').filter({ hasText: workflowName });
    const workflowActions = workflowRow.getByTestId('workflow-actions-menu');
    await workflowActions.click();
  }

  async pauseWorkflow(): Promise<void> {
    const pauseAction = this.page.getByTestId('pause-workflow');
    await pauseAction.click();

    const pauseModal = this.page.getByRole('dialog');
    await expect(pauseModal).toBeVisible();

    const proceedBtn = pauseModal.getByRole('button').filter({ hasText: 'Proceed' });
    await proceedBtn.click();
  }

  async enableWorkflow(): Promise<void> {
    const enableWorkflow = this.page.getByTestId('enable-workflow');
    await enableWorkflow.click();
  }

  async deleteWorkflow(): Promise<void> {
    const deleteWorkflow = this.page.getByTestId('delete-workflow');
    await deleteWorkflow.click();
    const deleteWorkflowModal = this.page.getByRole('dialog');
    const deleteBtn = deleteWorkflowModal.getByRole('button').filter({ hasText: 'Delete' });

    await deleteBtn.click();
  }

  async getDeleteWorkflowButton() {
    return this.page.getByTestId('delete-workflow');
  }
}
