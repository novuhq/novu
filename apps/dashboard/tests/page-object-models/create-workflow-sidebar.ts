import { type Page } from '@playwright/test';

export class CreateWorkflowSidebar {
  constructor(private page: Page) {}

  async createBtnClick(): Promise<void> {
    const createWorkflowBtn = this.page.getByRole('button', { name: 'Create workflow' });
    await createWorkflowBtn.click();
  }

  async getNameValidationError() {
    return this.page.getByText('Name is required');
  }

  async getTagsValidationError() {
    return this.page.getByText('Tags must contain at most 16');
  }

  async fillForm({
    workflowName,
    workflowDescription,
    tags,
  }: {
    workflowName: string;
    workflowDescription: string;
    tags: string[] | number;
  }): Promise<void> {
    // fill the workflow name
    await this.page.locator('input[name="name"]').fill(workflowName);

    // fill the tags
    const tagsInput = this.page.getByPlaceholder('Type a tag and press Enter');

    if (typeof tags === 'number') {
      for (let i = 0; i < tags; i++) {
        await tagsInput.click();
        await tagsInput.fill(`${1 + i}`);
        await tagsInput.press('Enter');
      }
    } else {
      for (const tag of tags) {
        await tagsInput.click();
        await tagsInput.fill(tag);
        await tagsInput.press('Enter');
      }
    }

    // fill the description
    const descriptionTextArea = this.page.getByPlaceholder('Describe what this workflow does');
    await descriptionTextArea.click();
    await descriptionTextArea.fill(workflowDescription);
  }

  async removeTag(tag: string): Promise<void> {
    const removeBtn = this.page.getByTestId(`tags-badge-remove-${tag}`);
    await removeBtn.click();
  }
}
