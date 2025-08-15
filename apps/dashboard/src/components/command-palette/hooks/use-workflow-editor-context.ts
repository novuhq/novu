import type { StepResponseDto, WorkflowResponseDto } from '@novu/shared';
import { useContext } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { WorkflowContext } from '@/components/workflow-editor/workflow-provider';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';

export function useWorkflowEditorContext() {
  const location = useLocation();
  const params = useParams<{ workflowSlug?: string; stepSlug?: string }>();

  // Check if we're in the workflow editor based on the URL pattern
  const isOnWorkflowEditorPath =
    location.pathname.includes('/workflows/') &&
    !location.pathname.includes('/workflows/create') &&
    !location.pathname.includes('/workflows/templates');

  // Extract workflow slug from URL or params
  const workflowSlug =
    params.workflowSlug ||
    (() => {
      const pathParts = location.pathname.split('/');
      const workflowsIndex = pathParts.findIndex((part) => part === 'workflows');
      return workflowsIndex !== -1 && workflowsIndex + 1 < pathParts.length ? pathParts[workflowsIndex + 1] : undefined;
    })();

  // Try to get workflow context from WorkflowProvider (if available)
  const workflowContext = useContext(WorkflowContext);
  const contextWorkflow: WorkflowResponseDto | undefined = workflowContext?.workflow;
  const contextStep: StepResponseDto | undefined = workflowContext?.step;
  const contextIsPending: boolean = workflowContext?.isPending ?? false;

  // Fetch workflow data independently if we don't have it from context
  const { workflow: fetchedWorkflow, isPending: fetchIsPending } = useFetchWorkflow({
    workflowSlug: isOnWorkflowEditorPath && !contextWorkflow ? workflowSlug : undefined,
  });

  // Use context data if available, otherwise use fetched data
  const workflow = contextWorkflow || fetchedWorkflow;
  const step = contextStep;
  const isPending = contextIsPending || fetchIsPending;

  const isInWorkflowEditor = isOnWorkflowEditorPath;

  return {
    isInWorkflowEditor,
    workflow: isInWorkflowEditor ? workflow : undefined,
    step: isInWorkflowEditor ? step : undefined,
    isPending,
  };
}
