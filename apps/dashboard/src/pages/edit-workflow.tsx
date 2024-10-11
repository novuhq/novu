import { EditWorkflow } from '@/components/edit-workflow';
import { EditWorkflowLayout } from '@/components/edit-workflow-layout';

export const EditWorkflowPage = () => {
  return (
    <EditWorkflowLayout headerStartItems={<h1 className="text-foreground-950">Edit Workflow</h1>}>
      <EditWorkflow />
    </EditWorkflowLayout>
  );
};
