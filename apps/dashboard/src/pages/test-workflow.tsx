import { useParams } from 'react-router-dom';
import { EditWorkflowLayout } from '@/components/edit-workflow-layout';
import { Toaster } from '@/components/primitives/sonner';
import { EditorBreadcrumbs } from '@/components/workflow-editor/editor-breadcrumbs';
import { TestWorkflowTabs } from '@/components/workflow-editor/test-workflow/test-workflow-tabs';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';
import { PageMeta } from '@/components/page-meta';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';

export const TestWorkflowPage = () => {
  const { workflowSlug = '' } = useParams<{ environmentId: string; workflowSlug: string }>();
  const { workflow } = useFetchWorkflow({
    workflowSlug,
  });
  const { testData } = useFetchWorkflowTestData({ workflowSlug });

  return (
    <>
      <PageMeta title={`Trigger ${workflow?.name}`} />
      <EditWorkflowLayout headerStartItems={<EditorBreadcrumbs />}>
        <TestWorkflowTabs testData={testData} />
        <Toaster />
      </EditWorkflowLayout>
    </>
  );
};
