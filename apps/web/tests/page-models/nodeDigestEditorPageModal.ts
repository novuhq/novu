import { Locator } from '@playwright/test';
import { ConditionsPage } from './conditionsPage';
import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';

export enum TimeUnit {
  SECONDS = 'sec (s)',
  MINUTES = 'min (s)',
  HOURS = 'hour (s)',
  DAYS = 'day (s)',
}
export class NodeDigestEditorPageModal extends WorkflowBaseSidePanelPage {
  timeAmount(): Locator {
    return this.page.getByTestId('time-amount');
  }

  timeUnit(): Locator {
    return this.page.getByTestId('time-unit');
  }

  getDropdownLocator(optionValue: string): Locator {
    return this.page.locator('.mantine-Select-item').getByText(optionValue);
  }
  mantineSelectItem(): Locator {
    return this.page.locator('.mantine-Select-item');
  }
  digestGroupByOptions(): Locator {
    return this.page.getByTestId('digest-group-by-options');
  }

  digestSendOptionsAccordionSwitch(): Locator {
    return this.page.getByTestId('digest-send-options');
  }

  async openAddConditionsSidebar() {
    await this.page.getByTestId('editor-sidebar-add-conditions').click();

    return new ConditionsPage(this.page);
  }

  getEditorSidebarEditConditionsButton() {
    return this.page.getByTestId('editor-sidebar-edit-conditions');
  }

  batchKey(): Locator {
    return this.page.getByTestId('batch-key');
  }

  onlyFrequentEventsSwitch(): Locator {
    return this.page.getByTestId('backoff-switch').locator('..');
  }

  backoffAmount(): Locator {
    return this.page.getByTestId('backoff-amount');
  }

  timeUnitBackoff(): Locator {
    return this.page.getByTestId('time-unit-backoff');
  }

  async chooseTimeUnitFromDropdown(digest: NodeDigestEditorPageModal, optionValue: TimeUnit) {
    await digest.timeUnit().click();
    await digest.getDropdownLocator(optionValue).click();
  }

  async chooseTimeUnitBackOffFromDropDown(digest: NodeDigestEditorPageModal, optionValue: TimeUnit) {
    await digest.timeUnitBackoff().click();
    await digest.getDropdownLocator(optionValue).click();
  }
}
