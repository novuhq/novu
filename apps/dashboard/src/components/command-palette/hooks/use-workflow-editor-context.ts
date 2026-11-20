import { useLocation, useParams } from 'react-router-dom';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { isWorkflowEditorPath } from '@/utils/routes';

export function useWorkflowEditorContext() {
  const location = useLocation();
  const params = useParams<{ workflowSlug?: string; stepSlug?: string }>();

  const isOnWorkflowEditorPath = isWorkflowEditorPath(location.pathname);

  const workflowSlug = params.workflowSlug;
  const isNewWorkflowSlug = workflowSlug === 'new';
  const { workflow: fetchedWorkflow, isPending: fetchIsPending } = useFetchWorkflow({
    workflowSlug: isOnWorkflowEditorPath && !isNewWorkflowSlug ? workflowSlug : undefined,
  });

  const workflow = fetchedWorkflow;

  const isInWorkflowEditor = isOnWorkflowEditorPath;

  return {
    isInWorkflowEditor,
    workflow: isInWorkflowEditor ? workflow : undefined,
    isPending: fetchIsPending,
  };
}
