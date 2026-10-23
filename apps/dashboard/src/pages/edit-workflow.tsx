import { EnvironmentTypeEnum } from '@novu/shared';
import { useLocation, useMatch, useParams } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/animated-outlet';
import {
  CopilotLauncher,
  CopilotPopover,
  CopilotWebChatProvider,
  useCopilotWebChat,
  useCopilotWebChatEnabled,
} from '@/components/copilot-web-chat';
import { FullPageLayout } from '@/components/full-page-layout';
import { EditorBreadcrumbs } from '@/components/workflow-editor/editor-breadcrumbs';
import { WorkflowProvider } from '@/components/workflow-editor/workflow-provider';
import { WorkflowTabs } from '@/components/workflow-editor/workflow-tabs';
import { IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { ROUTES } from '@/utils/routes';

// Define routes that should render without WorkflowTabs (full-page routes)
const FULL_PAGE_ROUTES = [
  ROUTES.EDIT_STEP_TEMPLATE,
  // Add more full-page routes here as needed
];

function renderFullPageLayout() {
  return (
    <div className="flex h-full w-full">
      <AnimatedOutlet />
    </div>
  );
}

function renderActivityLayout() {
  return (
    <div className="flex h-full flex-1 flex-nowrap">
      <WorkflowTabs />
    </div>
  );
}

function renderTraditionalLayout({ isNewWorkflowSlug }: { isNewWorkflowSlug: boolean }) {
  return (
    <div className="flex h-full flex-1 flex-nowrap">
      <WorkflowTabs />
      {!isNewWorkflowSlug && (
        <aside className="text-foreground-950 [&_textarea]:text-neutral-600'; flex h-full w-[350px] max-w-[350px] flex-col border-l [&_input]:text-xs [&_input]:text-neutral-600 [&_label]:text-xs [&_label]:font-medium [&_textarea]:text-xs">
          <AnimatedOutlet />
        </aside>
      )}
    </div>
  );
}

/** Shows the launcher/popover only once a page (canvas or step editor) registered a workflow context. */
function CopilotWebChatMount() {
  const { pageContext } = useCopilotWebChat();

  if (!pageContext?.workflowId) return null;

  return (
    <>
      <CopilotLauncher />
      <CopilotPopover />
    </>
  );
}

export const EditWorkflowPage = () => {
  const { currentEnvironment } = useEnvironment();
  const isCopilotWebChatEnabled =
    useCopilotWebChatEnabled() && !IS_SELF_HOSTED && currentEnvironment?.type === EnvironmentTypeEnum.DEV;

  const location = useLocation();
  const activityMatch = useMatch(ROUTES.EDIT_WORKFLOW_ACTIVITY);
  const { workflowSlug = '' } = useParams<{ workflowSlug?: string; stepSlug?: string }>();
  const isNewWorkflowSlug = workflowSlug === 'new';

  // Check if current route is a full-page route
  const isFullPageRoute = FULL_PAGE_ROUTES.some((route) => {
    // Convert route pattern to regex to match dynamic segments
    const routePattern = route.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`${routePattern}$`);

    return regex.test(location.pathname);
  });

  function getLayoutContent() {
    if (isFullPageRoute) {
      return renderFullPageLayout();
    }

    if (activityMatch) {
      return renderActivityLayout();
    }

    return renderTraditionalLayout({ isNewWorkflowSlug });
  }

  return (
    <CopilotWebChatProvider enabled={isCopilotWebChatEnabled}>
      <WorkflowProvider>
        <FullPageLayout headerStartItems={<EditorBreadcrumbs />}>{getLayoutContent()}</FullPageLayout>
      </WorkflowProvider>
      <CopilotWebChatMount />
    </CopilotWebChatProvider>
  );
};
