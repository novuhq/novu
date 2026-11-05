import type { CopilotMode } from './use-copilot-web-chat-enabled';

export function isWebChatMode(mode: CopilotMode | null): boolean {
  switch (mode) {
    case 'web-chat-sidebar':
    case 'web-chat-popover':
      return true;
    case 'legacy':
    case null:
      return false;
    default: {
      const unhandled: never = mode;

      return unhandled;
    }
  }
}

type ResolveCopilotModeParams = {
  isFlagsReady: boolean;
  liveMode: CopilotMode;
  /** The workflow's latest legacy `/ai` chat; only looked up when `liveMode` is a web-chat mode. */
  legacyChat: { isPending: boolean; isError: boolean; hasPendingChanges: boolean };
};

/** The mode a workflow visit should use, or `null` while that cannot be known yet. */
export function resolveCopilotMode({
  isFlagsReady,
  liveMode,
  legacyChat,
}: ResolveCopilotModeParams): CopilotMode | null {
  if (!isFlagsReady) {
    return null;
  }

  if (!isWebChatMode(liveMode)) {
    return liveMode;
  }

  if (legacyChat.isPending) {
    return null;
  }

  const hasLegacyChangesToReview = legacyChat.hasPendingChanges && !legacyChat.isError;

  return hasLegacyChangesToReview ? 'legacy' : liveMode;
}
