import { PageContainer } from '../../layout';
import { WorkflowsTable } from './table';

export const WorkflowsListPage = () => {
  return (
    <PageContainer title="Workflows">
      <WorkflowsTable />
    </PageContainer>
  );
};
