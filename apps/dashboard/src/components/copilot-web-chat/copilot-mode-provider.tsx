import { AiResourceTypeEnum, EnvironmentTypeEnum, FeatureFlagsKeysEnum, ResourceOriginEnum } from '@novu/shared';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag, useLaunchDarklyIdentified, useLaunchDarklyReady } from '@/hooks/use-feature-flag';
import { useFetchLatestAiChat } from '@/hooks/use-fetch-latest-ai-chat';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import {
  advanceVisitCopilotMode,
  type EditorCopilotMode,
  getCopilotSurface,
  isPendingCopilotMode,
  isWebChatMode,
  resolveCopilotMode,
  type VisitCopilotMode,
} from './copilot-mode';
import { CopilotModeContext, LegacyCopilotMigrationContext, useLiveCopilotMode } from './copilot-mode-context';
import { CopilotPopoverMount } from './copilot-popover';
import { CopilotWebChatProvider } from './copilot-web-chat-provider';
import { useCopilotPendingPrompt } from './use-copilot-pending-prompt';

type VisitMode = VisitCopilotMode & { workflowKey: string };

type VisitCopilot = {
  mode: EditorCopilotMode | null;
  /** The visit shows the legacy Copilot only until its unreviewed changes are kept or discarded. */
  isLegacyMigrationPending: boolean;
};

/**
 * Fixes the Copilot mode once per workflow visit: LaunchDarkly pushes flag changes into the page live, and swapping
 * the Copilot mid-chat would unmount the legacy chat and stop its running generation. A flag change applies when the
 * user opens another workflow or reloads. The one exception is a visit held on the legacy Copilot to review its
 * changes: it moves to the live mode as soon as the review is done, with nothing generating.
 */
function useVisitCopilotMode(workflowSlug: string | undefined, workflowKey: string): VisitCopilot {
  // Ready only covers the initial anonymous context; organization-targeted flags need the identified one.
  const isLaunchDarklyReady = useLaunchDarklyReady();
  const isLaunchDarklyIdentified = useLaunchDarklyIdentified();
  const liveMode = useLiveCopilotMode();
  const isAiWorkflowGenerationEnabled =
    useFeatureFlag(FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED) && IS_AI_FEATURES_ENABLED;
  const { currentEnvironment } = useEnvironment();
  const { workflow } = useFetchWorkflow({ workflowSlug });
  // Read live, so turning AI workflow generation off still removes the Copilot mid-visit.
  const hasCopilot =
    isAiWorkflowGenerationEnabled &&
    currentEnvironment?.type === EnvironmentTypeEnum.DEV &&
    !!workflow &&
    workflow.origin !== ResourceOriginEnum.EXTERNAL;
  const { latestChat, isPending, isFetching, error } = useFetchLatestAiChat({
    resourceType: AiResourceTypeEnum.WORKFLOW,
    // The latest-chat endpoint answers 404 (an error toast) while AI workflow generation is off.
    resourceId: hasCopilot && isWebChatMode(liveMode) ? workflow._id : undefined,
  });
  const resolvedMode = resolveCopilotMode({
    isFlagsReady: isLaunchDarklyReady && isLaunchDarklyIdentified,
    liveMode,
    // A cached chat from an earlier visit can be stale while its refresh runs; the visit's mode waits for it.
    legacyChat: {
      isPending: isPending || isFetching,
      isError: !!error,
      hasPendingChanges: !!latestChat?.hasPendingChanges,
    },
  });
  const [visitMode, setVisitMode] = useState<VisitMode>();

  const currentVisit = visitMode?.workflowKey === workflowKey ? visitMode : undefined;

  if (!isPendingCopilotMode(resolvedMode)) {
    const nextVisit = advanceVisitCopilotMode(currentVisit, resolvedMode, liveMode);

    if (nextVisit !== currentVisit) {
      setVisitMode({ ...nextVisit, workflowKey });
    }
  }

  if (!hasCopilot) {
    return { mode: null, isLegacyMigrationPending: false };
  }

  return {
    mode: currentVisit?.mode ?? resolvedMode,
    isLegacyMigrationPending: !!currentVisit?.isAwaitingLegacyReview && isWebChatMode(liveMode),
  };
}

/** Tells the user the Copilot changed under them when finishing a review moved the visit to the new one. */
function useAnnounceLegacyMigration(workflowKey: string, isLegacyMigrationPending: boolean) {
  const previous = useRef({ workflowKey, isLegacyMigrationPending });

  useEffect(() => {
    const { workflowKey: previousKey, isLegacyMigrationPending: wasPending } = previous.current;

    if (previousKey === workflowKey && wasPending && !isLegacyMigrationPending) {
      showSuccessToast('Your changes are resolved. Continue in the new Novu Copilot.');
    }

    previous.current = { workflowKey, isLegacyMigrationPending };
  }, [workflowKey, isLegacyMigrationPending]);
}

function CopilotPendingPrompt() {
  useCopilotPendingPrompt();

  return null;
}

/**
 * Decides which Copilot the workflow editor shows on this visit (a Development environment, a non-external workflow,
 * AI workflow generation, then the mode flags) and hosts the web-chat conversation when that is the one.
 */
export function CopilotModeProvider({ workflowSlug, children }: { workflowSlug?: string; children: ReactNode }) {
  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const workflowKey = getIdFromSlug({ slug: workflowSlug ?? '', divider: WORKFLOW_DIVIDER });
  const { mode, isLegacyMigrationPending } = useVisitCopilotMode(workflowSlug, workflowKey);
  useAnnounceLegacyMigration(workflowKey, isLegacyMigrationPending);
  const surface = getCopilotSurface(mode);
  const conversationScope =
    currentUser?._id && currentEnvironment?._id && workflowSlug
      ? `${currentUser._id}:${currentEnvironment._id}:${workflowKey}`
      : undefined;

  return (
    <CopilotModeContext.Provider value={mode}>
      <LegacyCopilotMigrationContext.Provider value={isLegacyMigrationPending}>
        <CopilotWebChatProvider surface={surface} conversationScope={conversationScope}>
          {children}
          {surface && <CopilotPendingPrompt />}
          {surface === 'popover' && <CopilotPopoverMount />}
        </CopilotWebChatProvider>
      </LegacyCopilotMigrationContext.Provider>
    </CopilotModeContext.Provider>
  );
}
