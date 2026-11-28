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

/** The mode a workflow visit runs on. `isAwaitingLegacyReview` is a legacy visit that only stays legacy to finish a review. */
export type VisitCopilotMode = { mode: CopilotMode; isAwaitingLegacyReview: boolean };

/**
 * Fixes a visit's mode on the first resolved one. A visit held on the legacy sidebar for unreviewed changes moves on to
 * the live web-chat mode once they are kept or discarded, so the user does not have to reload to leave the old view.
 * A legacy visit that is legacy because the flags say so never moves mid-visit: that would stop its running generation.
 */
export function advanceVisitCopilotMode(
  current: VisitCopilotMode | undefined,
  resolvedMode: CopilotMode,
  liveMode: CopilotMode
): VisitCopilotMode {
  if (!current) {
    return { mode: resolvedMode, isAwaitingLegacyReview: resolvedMode === 'legacy' && isWebChatMode(liveMode) };
  }

  if (current.isAwaitingLegacyReview && resolvedMode !== 'legacy') {
    return { mode: resolvedMode, isAwaitingLegacyReview: false };
  }

  return current;
}
