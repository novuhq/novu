import { Button } from '@novu/novui';
import { PageContainer } from '../../layout';
import { WorkflowsTable } from './table';

export const WorkflowsListPage = () => {
  return (
    <PageContainer title="Workflows">
      <Button onClick={() => alert('hello!')}>Hello!</Button>
      <WorkflowsTable />
    </PageContainer>
  );
};
