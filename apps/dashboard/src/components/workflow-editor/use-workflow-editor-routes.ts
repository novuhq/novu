import { useLocalMode } from '@/context/local-mode';
import { ROUTES } from '@/utils/routes';

/**
 * The workflow editor is mounted both at the regular route
 * (`/env/:slug/workflows/:workflowSlug`) and, for virtual local-bridge
 * workflows, under the Local pseudo-environment
 * (`/env/:slug/local/workflows/:workflowSlug`). Components building absolute
 * editor links must use these patterns so navigation stays within the mount.
 */
export const useWorkflowEditorRoutes = () => {
  const { isLocalRoute } = useLocalMode();

  return {
    isLocalRoute,
    editWorkflowRoute: isLocalRoute ? ROUTES.LOCAL_EDIT_WORKFLOW : ROUTES.EDIT_WORKFLOW,
    triggerWorkflowRoute: isLocalRoute ? ROUTES.LOCAL_TRIGGER_WORKFLOW : ROUTES.TRIGGER_WORKFLOW,
    workflowsRoute: isLocalRoute ? ROUTES.LOCAL_WORKFLOWS : ROUTES.WORKFLOWS,
    activityRoute: isLocalRoute ? ROUTES.ACTIVITY_FEED : ROUTES.EDIT_WORKFLOW_ACTIVITY,
  };
};
