import { AiResourceTypeEnum, CopilotPageEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { type ReactNode, useState } from 'react';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag, useLaunchDarklyIdentified, useLaunchDarklyReady } from '@/hooks/use-feature-flag';
import { useFetchLatestAiChat } from '@/hooks/use-fetch-latest-ai-chat';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import {
  type CopilotMode,
  type EditorCopilotMode,
  getCopilotSurface,
  getEditorCopilotAccess,
  isPendingCopilotMode,
  isWebChatMode,
  resolveCopilotMode,
} from './copilot-mode';
import { CopilotModeContext, useLiveCopilotMode } from './copilot-mode-context';
import { CopilotPopoverMount } from './copilot-popover';
import { CopilotWebChatProvider } from './copilot-web-chat-provider';
import { useCopilotPageEnabled } from './use-copilot-pages';
import { useCopilotPendingPrompt } from './use-copilot-pending-prompt';

type VisitMode = { workflowKey: string; mode: CopilotMode };

const NO_LEGACY_CHAT = { isPending: false, isError: false, hasPendingChanges: false };

/**
 * Fixes the Copilot mode once per workflow visit: LaunchDarkly pushes flag changes into the page live, and swapping
 * the Copilot mid-chat would unmount the legacy chat and stop its running generation. A flag change applies when the
 * user opens another workflow or reloads.
 */
function useVisitCopilotMode(workflowSlug: string | undefined, workflowKey: string): EditorCopilotMode | null {
  // Ready only covers the initial anonymous context; organization-targeted flags need the identified one.
  const isLaunchDarklyReady = useLaunchDarklyReady();
  const isLaunchDarklyIdentified = useLaunchDarklyIdentified();
  const liveMode = useLiveCopilotMode();
  const isAiWorkflowGenerationEnabled =
    useFeatureFlag(FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED) && IS_AI_FEATURES_ENABLED;
  const { currentEnvironment } = useEnvironment();
  const { workflow } = useFetchWorkflow({ workflowSlug });
  const isWorkflowsPageEnabled = useCopilotPageEnabled(CopilotPageEnum.WORKFLOWS);
  // Read live, so turning AI workflow generation off still removes the Copilot mid-visit.
  const { hasCopilot, isReadOnly: isReadOnlyCopilot } = getEditorCopilotAccess({
    environmentType: currentEnvironment?.type,
    workflow,
    isAiWorkflowGenerationEnabled,
    isWorkflowsPageEnabled,
    liveMode,
  });
  const { latestChat, isPending, isFetching, error } = useFetchLatestAiChat({
    resourceType: AiResourceTypeEnum.WORKFLOW,
    // The latest-chat endpoint answers 404 (an error toast) while AI workflow generation is off. The legacy chat only
    // ever edited workflows in Development, so a read-only visit has none to review.
    resourceId: workflow && hasCopilot && !isReadOnlyCopilot && isWebChatMode(liveMode) ? workflow._id : undefined,
  });
  const resolvedMode = resolveCopilotMode({
    isFlagsReady: isLaunchDarklyReady && isLaunchDarklyIdentified,
    liveMode,
    // A cached chat from an earlier visit can be stale while its refresh runs; the visit's mode waits for it.
    legacyChat: isReadOnlyCopilot
      ? NO_LEGACY_CHAT
      : {
          isPending: isPending || isFetching,
          isError: !!error,
          hasPendingChanges: !!latestChat?.hasPendingChanges,
        },
  });
  const [visitMode, setVisitMode] = useState<VisitMode>();

  if (!isPendingCopilotMode(resolvedMode) && visitMode?.workflowKey !== workflowKey) {
    setVisitMode({ workflowKey, mode: resolvedMode });
  }

  if (!hasCopilot) {
    return null;
  }

  const mode = visitMode?.workflowKey === workflowKey ? visitMode.mode : resolvedMode;

  // The legacy Copilot edits, so a read-only visit never shows it: one fixed on legacy before its flags flipped to web
  // chat shows no Copilot until the user opens another workflow or reloads.
  if (isReadOnlyCopilot && (mode === 'legacy' || mode === 'pending-legacy')) {
    return null;
  }

  return mode;
}

function CopilotPendingPrompt() {
  useCopilotPendingPrompt();

  return null;
}

/**
 * Decides which Copilot the workflow editor shows on this visit (AI workflow generation; a Development environment and
 * a non-external workflow, or else read-only web chat with the Workflows page on; then the mode flags) and hosts the
 * web-chat conversation when that is the one.
 */
export function CopilotModeProvider({ workflowSlug, children }: { workflowSlug?: string; children: ReactNode }) {
  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const workflowKey = getIdFromSlug({ slug: workflowSlug ?? '', divider: WORKFLOW_DIVIDER });
  const mode = useVisitCopilotMode(workflowSlug, workflowKey);
  const surface = getCopilotSurface(mode);
  const conversationScope =
    currentUser?._id && currentEnvironment?._id && workflowSlug
      ? `${currentUser._id}:${currentEnvironment._id}:${workflowKey}`
      : undefined;

  return (
    <CopilotModeContext.Provider value={mode}>
      <CopilotWebChatProvider surface={surface} conversationScope={conversationScope}>
        {children}
        {surface && <CopilotPendingPrompt />}
        {surface === 'popover' && <CopilotPopoverMount />}
      </CopilotWebChatProvider>
    </CopilotModeContext.Provider>
  );
}
