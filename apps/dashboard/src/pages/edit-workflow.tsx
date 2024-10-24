import { EditWorkflowLayout } from '@/components/edit-workflow-layout';
import { Toaster } from '@/components/primitives/sonner';
import { WorkflowEditor } from '@/components/workflow-editor/workflow-editor';
import { WorkflowEditorProvider } from '@/components/workflow-editor/workflow-editor-provider';
import { EditorBreadcrumbs } from '@/components/workflow-editor/editor-breadcrumbs';

export const EditWorkflowPage = () => {
  return (
    <WorkflowEditorProvider>
      <EditWorkflowLayout headerStartItems={<EditorBreadcrumbs />}>
        <WorkflowEditor />
        <Toaster />
      </EditWorkflowLayout>
    </WorkflowEditorProvider>
  );
};
