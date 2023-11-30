import { TemplatePreference } from './notification-setting-form/TemplatePreference';
import { WorkflowSettingsTabs } from './WorkflowSettingsTabs';
import { WorkflowSidebar } from './WorkflowSidebar';

export function UserPreference() {
  return (
    <WorkflowSidebar title="Workflow Settings">
      <WorkflowSettingsTabs />
      <TemplatePreference />
    </WorkflowSidebar>
  );
}
