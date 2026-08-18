import { Navigate, useLocation } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { EditorBreadcrumbs } from '@/components/workflow-editor/editor-breadcrumbs';
import { LocalWorkflowProvider } from '@/components/workflow-editor/local-workflow-provider';
import { StepEditorSkeleton } from '@/components/workflow-editor/steps/step-editor-skeleton';
import { EditorAsideSkeleton } from '@/components/workflow-editor/workflow-editor-skeleton';
import { WorkflowTabs } from '@/components/workflow-editor/workflow-tabs';
import { useLocalMode } from '@/context/local-mode';
import { PageHeader } from '@/context/page-header';
import { ROUTES } from '@/utils/routes';

const FULL_PAGE_ROUTES = [ROUTES.EDIT_STEP_TEMPLATE];

/**
 * The workflow editor mounted on a virtual (local bridge) workflow. Layout
 * mirrors `EditWorkflowPage`; the data layer is `LocalWorkflowProvider`.
 */
export const LocalEditWorkflowPage = () => {
  const location = useLocation();
  const { isEnabled } = useLocalMode();

  if (!isEnabled) {
    return <Navigate to={ROUTES.LOCAL_HANDSHAKE} replace />;
  }

  const isFullPageRoute = FULL_PAGE_ROUTES.some((route) => {
    const routePattern = route.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`${routePattern}$`);

    return regex.test(location.pathname);
  });

  return (
    <LocalWorkflowProvider>
      <PageHeader>
        <EditorBreadcrumbs />
      </PageHeader>
      {isFullPageRoute ? (
        <div className="flex h-full w-full">
          <AnimatedOutlet fallback={<StepEditorSkeleton />} />
        </div>
      ) : (
        <div className="flex h-full flex-1 flex-nowrap">
          <WorkflowTabs />
          <aside className="text-foreground-950 [&_textarea]:text-neutral-600'; flex h-full w-[350px] max-w-[350px] flex-col border-l [&_input]:text-xs [&_input]:text-neutral-600 [&_label]:text-xs [&_label]:font-medium [&_textarea]:text-xs">
            <AnimatedOutlet fallback={<EditorAsideSkeleton />} />
          </aside>
        </div>
      )}
    </LocalWorkflowProvider>
  );
};
