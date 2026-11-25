import { EnvironmentTypeEnum, ResourceOriginEnum } from '@novu/shared';
import type { CopilotSurface } from './copilot-web-chat-context';

/** Rollout steps of the workflow editor Copilot: the legacy `/ai` sidebar, web chat in that sidebar, then the popover. */
export type CopilotMode = 'legacy' | 'web-chat-sidebar' | 'web-chat-popover';

/** The mode the cached flags predict while a visit's mode is not known yet; the editor already draws its frame. */
export type PendingCopilotMode = `pending-${CopilotMode}`;

export type EditorCopilotMode = CopilotMode | PendingCopilotMode;

export function isPendingCopilotMode(mode: EditorCopilotMode): mode is PendingCopilotMode {
  return mode.startsWith('pending-');
}

/** Where web chat shows the conversation, or `null` while the visit does not run on web chat (yet). */
export function getCopilotSurface(mode: EditorCopilotMode | null): CopilotSurface | null {
  switch (mode) {
    case 'web-chat-sidebar':
      return 'sidebar';
    case 'web-chat-popover':
      return 'popover';
    case 'legacy':
    case 'pending-legacy':
    case 'pending-web-chat-sidebar':
    case 'pending-web-chat-popover':
    case null:
      return null;
    default: {
      const unhandled: never = mode;

      return unhandled;
    }
  }
}

export function isWebChatMode(mode: EditorCopilotMode | null): boolean {
  return getCopilotSurface(mode) !== null;
}

type EditorCopilotAccessParams = {
  /** Undefined until the environment loads. */
  environmentType?: string;
  /** Undefined until the workflow loads. */
  workflow?: { origin?: string };
  isAiWorkflowGenerationEnabled: boolean;
  /** Whether `COPILOT_PAGES` lists the Workflows page for the organization. */
  isWorkflowsPageEnabled: boolean;
  liveMode: CopilotMode;
};

/**
 * Whether a workflow visit gets a Copilot, and whether that Copilot only discusses the workflow: outside Development
 * and for a code workflow, web chat with the Workflows page on reads it, and the agent holds back the tools that
 * change workflows. No Copilot until the environment and the workflow load, so a Development visit never settles on
 * read-only web chat before its legacy chat is checked.
 */
export function getEditorCopilotAccess({
  environmentType,
  workflow,
  isAiWorkflowGenerationEnabled,
  isWorkflowsPageEnabled,
  liveMode,
}: EditorCopilotAccessParams): { hasCopilot: boolean; isReadOnly: boolean } {
  if (!isAiWorkflowGenerationEnabled || !environmentType || !workflow) {
    return { hasCopilot: false, isReadOnly: false };
  }

  if (environmentType === EnvironmentTypeEnum.DEV && workflow.origin !== ResourceOriginEnum.EXTERNAL) {
    return { hasCopilot: true, isReadOnly: false };
  }

  const isReadOnly = isWorkflowsPageEnabled && isWebChatMode(liveMode);

  return { hasCopilot: isReadOnly, isReadOnly };
}

type ResolveCopilotModeParams = {
  isFlagsReady: boolean;
  liveMode: CopilotMode;
  /** The workflow's latest legacy `/ai` chat; only looked up when `liveMode` is a web-chat mode. */
  legacyChat: { isPending: boolean; isError: boolean; hasPendingChanges: boolean };
};

/** The mode a workflow visit should use, or the one `liveMode` predicts while that cannot be known yet. */
export function resolveCopilotMode({
  isFlagsReady,
  liveMode,
  legacyChat,
}: ResolveCopilotModeParams): EditorCopilotMode {
  if (!isFlagsReady) {
    return `pending-${liveMode}`;
  }

  if (!isWebChatMode(liveMode)) {
    return liveMode;
  }

  if (legacyChat.isPending) {
    return `pending-${liveMode}`;
  }

  const hasLegacyChangesToReview = legacyChat.hasPendingChanges && !legacyChat.isError;

  return hasLegacyChangesToReview ? 'legacy' : liveMode;
}
