import { TemplatePreference } from './notification-setting-form/TemplatePreference';
import { SubPageWrapper } from './SubPageWrapper';
import { WorkflowSettingsTabs } from './WorkflowSettingsTabs';

export function UserPreference() {
  return (
    <SubPageWrapper title="Workflow Settings">
      <WorkflowSettingsTabs />
      <TemplatePreference />
    </SubPageWrapper>
  );
}
