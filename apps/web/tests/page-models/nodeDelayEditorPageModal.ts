import { ConditionsPage } from './conditionsPage';
import { WorkflowBaseSidePanelPage } from './workflowSettingsSidePanel';

export class NodeDelayEditorPageModal extends WorkflowBaseSidePanelPage {
  getEditorSidebarEditConditionsButton() {
    return this.page.getByTestId('editor-sidebar-edit-conditions');
  }

  getDelayModeSwitch() {
    return this.page.getByTestId('delay-type');
  }

  async openAddConditionsSidebar() {
    await this.page.getByTestId('editor-sidebar-add-conditions').click();

    return new ConditionsPage(this.page);
  }
}
