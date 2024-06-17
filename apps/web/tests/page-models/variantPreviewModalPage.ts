import { expect } from '@playwright/test';
import { addConditions } from '../utils/commands';
import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';

export class VariantPreviewModalPage extends WorkflowBaseSidePanelPage {
  async addVariantConditionAtIndex(index: number) {
    await this.getVariantAtIndex(index).hover();
    await this.getVariantAddConditionButton(index).click();
    await addConditions(this.page);
  }
  getVariantAddConditionButton(index: number) {
    return this.getVariantAtIndex(index).getByTestId('add-conditions-action');
  }
  public getVariantAddConditionsButton() {
    return this.page.getByTestId('variant-sidebar-add-conditions');
  }

  public getVariantEditConditionsButton() {
    return this.page.getByTestId('variant-sidebar-edit-conditions');
  }
  public async addConditionToVariantNode() {
    await this.getVariantAddConditionsButton().click();
    await addConditions(this.page);
  }
  public async assertHasVariant(variant: VARIANT_NAMES) {
    await expect(this.getVariantAtIndex(0)).toContainText(variant);
    await expect(this.getVariantAtIndex(0).getByTestId('conditions-action')).toContainText('1');
    await expect(this.getVariantRootCard()).toBeVisible();
  }

  public getVariantRootCard() {
    return this.page.getByTestId('variant-root-card');
  }

  public getVariantAtIndex(index: number) {
    return this.page.getByTestId(`variant-item-card-${index}`);
  }

  public async assertHasVariantCount(count: number) {
    await expect(this.page.getByTestId('variants-count')).toContainText(`${count} variants`);
  }

  getVariantPreviewAddVariantButton() {
    return this.page.getByTestId('variant-sidebar-add-variant');
  }
}

export enum VARIANT_NAMES {
  IN_APP = 'V1 In-App',
  EMAIL = 'V1 Email',
  SMS = 'V1 SMS',
  CHAT = 'V1 Chat',
  PUSH = 'V1 Push',
}
