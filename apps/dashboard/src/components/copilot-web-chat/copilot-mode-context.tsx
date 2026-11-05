import { AiResourceTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useFeatureFlag, useLaunchDarklyIdentified, useLaunchDarklyReady } from '@/hooks/use-feature-flag';
import { useFetchLatestAiChat } from '@/hooks/use-fetch-latest-ai-chat';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import {
  type CopilotMode,
  type EditorCopilotMode,
  isPendingCopilotMode,
  isWebChatMode,
  resolveCopilotMode,
} from './copilot-mode';
import { useCopilotMode } from './use-copilot-web-chat-enabled';

/** `undefined` means no `CopilotModeProvider` above. */
const CopilotModeContext = createContext<EditorCopilotMode | undefined>(undefined);

type VisitMode = { workflowKey: string; mode: CopilotMode };

function useAiWorkflowGenerationEnabled(): boolean {
  return useFeatureFlag(FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED) && IS_AI_FEATURES_ENABLED;
}

/**
 * Fixes the Copilot mode once per workflow visit: LaunchDarkly pushes flag changes into the page live, and swapping
 * the Copilot mid-chat would unmount the legacy chat and stop its running generation. A flag change applies when the
 * user opens another workflow or reloads.
 */
export function CopilotModeProvider({ workflowSlug, children }: { workflowSlug?: string; children: ReactNode }) {
  // Ready only covers the initial anonymous context; organization-targeted flags need the identified one.
  const isLaunchDarklyReady = useLaunchDarklyReady();
  const isLaunchDarklyIdentified = useLaunchDarklyIdentified();
  const isFlagsReady = isLaunchDarklyReady && isLaunchDarklyIdentified;
  const liveMode = useCopilotMode();
  // The latest-chat endpoint answers 404 (an error toast) while AI workflow generation is off.
  const isAiWorkflowGenerationEnabled = useAiWorkflowGenerationEnabled();
  const { workflow } = useFetchWorkflow({ workflowSlug });
  const { latestChat, isPending, error } = useFetchLatestAiChat({
    resourceType: AiResourceTypeEnum.WORKFLOW,
    resourceId: isWebChatMode(liveMode) && isAiWorkflowGenerationEnabled ? workflow?._id : undefined,
  });
  const resolvedMode = resolveCopilotMode({
    isFlagsReady,
    liveMode,
    legacyChat: { isPending, isError: !!error, hasPendingChanges: !!latestChat?.hasPendingChanges },
  });
  const workflowKey = getIdFromSlug({ slug: workflowSlug ?? '', divider: WORKFLOW_DIVIDER });
  const [visitMode, setVisitMode] = useState<VisitMode>();

  if (!isPendingCopilotMode(resolvedMode) && visitMode?.workflowKey !== workflowKey) {
    setVisitMode({ workflowKey, mode: resolvedMode });
  }

  const mode = visitMode?.workflowKey === workflowKey ? visitMode.mode : resolvedMode;

  return <CopilotModeContext.Provider value={mode}>{children}</CopilotModeContext.Provider>;
}

/**
 * The Copilot mode fixed for this workflow visit (a `pending-*` prediction until then), or the live mode outside a
 * `CopilotModeProvider`. `null` means no Copilot: AI workflow generation is off (read live, so turning it off still
 * applies).
 */
export function useEditorCopilotMode(): EditorCopilotMode | null {
  const visitMode = useContext(CopilotModeContext);
  const liveMode = useCopilotMode();
  const isAiWorkflowGenerationEnabled = useAiWorkflowGenerationEnabled();

  if (!isAiWorkflowGenerationEnabled) {
    return null;
  }

  return visitMode ?? liveMode;
}
