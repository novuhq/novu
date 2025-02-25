import { type Page } from '@playwright/test';

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
    const pauseModal = this.page.getByRole('dialog');
    const proceedBtn = pauseModal.getByRole('button').filter({ hasText: 'Proceed' });

    await pauseAction.click();
    await proceedBtn.click();

    await this.page.waitForResponse(
      (resp) => resp.url().includes('/v2/workflows') && resp.request().method() === 'PATCH' && resp.status() === 200
    );
    await this.page.waitForTimeout(200);
  }

  async enableWorkflow(): Promise<void> {
    const enableWorkflow = this.page.getByTestId('enable-workflow');
    await enableWorkflow.click();

    await this.page.waitForResponse(
      (resp) => resp.url().includes('/v2/workflows') && resp.request().method() === 'PATCH' && resp.status() === 200
    );
    await this.page.waitForTimeout(200);
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
