import { EnvironmentTypeEnum } from '@novu/shared';
import type { ReactNode } from 'react';
import { useLocation, useMatch, useParams } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/animated-outlet';
import {
  CopilotLauncher,
  type CopilotMode,
  CopilotModeProvider,
  CopilotPopover,
  type CopilotSurface,
  CopilotWebChatProvider,
  isWebChatMode,
  useCopilotPendingPrompt,
  useCopilotWebChat,
  useEditorCopilotMode,
} from '@/components/copilot-web-chat';
import { FullPageLayout } from '@/components/full-page-layout';
import { EditorBreadcrumbs } from '@/components/workflow-editor/editor-breadcrumbs';
import { WorkflowProvider } from '@/components/workflow-editor/workflow-provider';
import { WorkflowTabs } from '@/components/workflow-editor/workflow-tabs';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
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

function CopilotPendingPrompt() {
  useCopilotPendingPrompt();

  return null;
}

/** Shows the launcher/popover only once a page (canvas or step editor) registered a workflow context. */
function CopilotPopoverMount() {
  const { pageContext } = useCopilotWebChat();

  if (!pageContext?.workflowId) return null;

  return (
    <>
      <CopilotLauncher />
      <CopilotPopover />
    </>
  );
}

/** The provider is disabled in the other modes, so they leave the surface to its default. */
function getCopilotSurface(mode: CopilotMode | null): CopilotSurface | undefined {
  switch (mode) {
    case 'web-chat-sidebar':
      return 'sidebar';
    case 'web-chat-popover':
      return 'popover';
    case 'legacy':
    case null:
      return undefined;
    default: {
      const unhandled: never = mode;

      return unhandled;
    }
  }
}

function CopilotWebChatHost({ conversationScope, children }: { conversationScope?: string; children: ReactNode }) {
  const { currentEnvironment } = useEnvironment();
  const copilotMode = useEditorCopilotMode();
  const isWebChat = isWebChatMode(copilotMode);

  return (
    <CopilotWebChatProvider
      enabled={isWebChat && currentEnvironment?.type === EnvironmentTypeEnum.DEV}
      conversationScope={conversationScope}
      surface={getCopilotSurface(copilotMode)}
    >
      {children}
      {isWebChat && <CopilotPendingPrompt />}
      {copilotMode === 'web-chat-popover' && <CopilotPopoverMount />}
    </CopilotWebChatProvider>
  );
}

export const EditWorkflowPage = () => {
  const { currentEnvironment } = useEnvironment();
  const { currentUser } = useAuth();

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
    <CopilotModeProvider workflowSlug={isNewWorkflowSlug ? undefined : workflowSlug}>
      <CopilotWebChatHost
        conversationScope={
          currentUser?._id && currentEnvironment?._id && !isNewWorkflowSlug
            ? `${currentUser._id}:${currentEnvironment._id}:${getIdFromSlug({ slug: workflowSlug, divider: WORKFLOW_DIVIDER })}`
            : undefined
        }
      >
        <WorkflowProvider>
          <FullPageLayout headerStartItems={<EditorBreadcrumbs />}>{getLayoutContent()}</FullPageLayout>
        </WorkflowProvider>
      </CopilotWebChatHost>
    </CopilotModeProvider>
  );
};
