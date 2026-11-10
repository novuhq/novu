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
