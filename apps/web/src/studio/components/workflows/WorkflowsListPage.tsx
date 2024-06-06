import { SettingsPageContainer } from '../../../pages/settings/SettingsPageContainer';
import { WorkflowsTable } from './table';

export const WorkflowsListPage = () => {
  return (
    <SettingsPageContainer title="Workflows">
      <WorkflowsTable />
    </SettingsPageContainer>
  );
};
