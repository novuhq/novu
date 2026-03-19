import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ActivityFeedContent } from '@/components/activity/activity-feed-content';
import { TestWorkflowDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-drawer';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';

export function WorkflowActivity() {
  const { workflow } = useWorkflow();
  const { workflowSlug = '' } = useParams<{ workflowSlug?: string }>();
  const [isTriggerDrawerOpen, setIsTriggerDrawerOpen] = useState(false);
  const { testData } = useFetchWorkflowTestData({ workflowSlug });

  const initialFilters = useMemo(() => {
    if (!workflow?._id) return {};

    return {
      workflows: [workflow._id],
    };
  }, [workflow?._id]);

  if (!workflow) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-foreground-600">Loading workflow...</div>
      </div>
    );
  }

  return (
    <>
      <ActivityFeedContent
        initialFilters={initialFilters}
        hideFilters={['workflows']}
        className="h-full max-w-full"
        contentHeight="h-[calc(100%-50px)]"
        onTriggerWorkflow={() => setIsTriggerDrawerOpen(true)}
      />
      <TestWorkflowDrawer
        isOpen={isTriggerDrawerOpen}
        onOpenChange={setIsTriggerDrawerOpen}
        testData={testData}
      />
    </>
  );
}
