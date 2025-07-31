import { useParams } from 'react-router-dom';
import { FullPageLayout } from '@/components/full-page-layout';
import { PageMeta } from '@/components/page-meta';
import { Toaster } from '@/components/primitives/sonner';
import { EditorBreadcrumbs } from '@/components/workflow-editor/editor-breadcrumbs';
import { TestWorkflowTabs } from '@/components/workflow-editor/test-workflow/test-workflow-tabs';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';
import { WorkflowProvider } from '../components/workflow-editor/workflow-provider';

export const TestWorkflowPage = () => {
  const { workflowSlug = '' } = useParams<{ environmentId: string; workflowSlug: string }>();
  const { workflow } = useFetchWorkflow({
    workflowSlug,
  });
  const { testData } = useFetchWorkflowTestData({ workflowSlug });

  return (
    <>
      <PageMeta title={`Trigger ${workflow?.name}`} />
      <WorkflowProvider>
        <FullPageLayout headerStartItems={<EditorBreadcrumbs />}>
          <TestWorkflowTabs testData={testData} />
          <Toaster />
        </FullPageLayout>
      </WorkflowProvider>
    </>
  );
};
