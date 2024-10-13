import { WorkflowList } from '@/components/workflow-list';
import { DashboardLayout } from '@/components/dashboard-layout';

export const WorkflowsPage = () => {
  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Workflows</h1>}>
      <WorkflowList />
    </DashboardLayout>
  );
};
