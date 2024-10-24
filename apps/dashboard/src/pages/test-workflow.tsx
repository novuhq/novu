import { useParams } from 'react-router-dom';
import { EditWorkflowLayout } from '@/components/edit-workflow-layout';
import { Toaster } from '@/components/primitives/sonner';
import { EditorBreadcrumbs } from '@/components/workflow-editor/editor-breadcrumbs';
import { TestWorkflowTabs } from '@/components/workflow-editor/test-workflow/test-workflow-tabs';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';

export const TestWorkflowPage = () => {
  const { workflowId = '' } = useParams<{ environmentId: string; workflowId: string }>();
  const { testData } = useFetchWorkflowTestData({ workflowId });

  return (
    <EditWorkflowLayout headerStartItems={<EditorBreadcrumbs />}>
      {testData && <TestWorkflowTabs testData={testData} />}
      <Toaster />
    </EditWorkflowLayout>
  );
};
