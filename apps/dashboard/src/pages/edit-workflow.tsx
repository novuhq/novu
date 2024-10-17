import { WorkflowEditor, WorkflowEditorProvider } from '@/components/workflow-editor';
import { EditWorkflowLayout } from '@/components/edit-workflow-layout';
import { Toaster } from '@/components/primitives/sonner';

export const EditWorkflowPage = () => {
  return (
    <EditWorkflowLayout headerStartItems={<h1 className="text-foreground-950">Edit Workflow</h1>}>
      <WorkflowEditorProvider>
        <WorkflowEditor />
        <Toaster />
      </WorkflowEditorProvider>
    </EditWorkflowLayout>
  );
};
