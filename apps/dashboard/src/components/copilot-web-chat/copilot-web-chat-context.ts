import type { UseWebChatResult } from '@novu/react';
import { createContext, useContext, useEffect, useRef } from 'react';
import type { CopilotCardAction, CopilotPageContext } from './copilot-web-chat-utils';

export type CopilotOpenOptions = { prefill?: string };

/** Where the workflow editor shows the conversation: inside its sidebar, or in the floating popover. */
export type CopilotSurface = 'sidebar' | 'popover';

export type CopilotWebChatContextValue = {
  /** False on self-hosted or while the tenant context is unavailable. */
  isAvailable: boolean;
  /** True until the tenant context has been minted or failed to mint; false once it is known whether the Copilot is available. */
  isConnecting: boolean;
  /** `null` while the workflow editor does not run the Copilot on web chat. */
  surface: CopilotSurface | null;
  isOpen: boolean;
  /** Opens the popover or reveals the sidebar; `prefill` replaces the composer text without sending it. */
  open: (options?: CopilotOpenOptions) => void;
  close: () => void;
  toggle: () => void;
  chat?: UseWebChatResult;
  pageContext?: CopilotPageContext;
  /** Resolves false when the send was refused before reaching the conversation (empty, loading or mid-run). */
  sendMessage: (text: string) => Promise<boolean>;
  /** Resends the last message with the workflow/step it was originally sent for. */
  retry: () => Promise<void>;
  /** Stops the running reply. The partial answer stays in the thread, marked as stopped. */
  stop: () => Promise<void>;
  /** Clicks a card button. Keep / Revert / Try again also lock their card until the agent answers. */
  sendCardAction: (action: CopilotCardAction) => Promise<void>;
  /** The `sourceMessageId` of the review card whose click the agent has not answered yet. */
  pendingReviewMessageId?: string;
  startNewConversation: () => void;
  /** Unsent composer text, kept here so minimizing the popover does not discard it. */
  draft: string;
  setDraft: (value: string) => void;
  /** True from an `open()`, including while already open, until the composer has taken the focus. */
  isRevealPending: boolean;
  completeReveal: () => void;
  /** True when an answer finished while the popover was closed and has not been seen yet. */
  hasUnseenAnswer: boolean;
  hasRunError: boolean;
  /** True from a send until the reply settles, including the gap before the server reports `run-start`. */
  isBusy: boolean;
};

const noop = () => {};

export const CopilotWebChatContext = createContext<CopilotWebChatContextValue>({
  isAvailable: false,
  isConnecting: false,
  surface: null,
  isOpen: false,
  open: noop,
  close: noop,
  toggle: noop,
  sendMessage: async () => false,
  retry: async () => {},
  stop: async () => {},
  sendCardAction: async () => {},
  startNewConversation: noop,
  draft: '',
  setDraft: noop,
  isRevealPending: false,
  completeReveal: noop,
  hasUnseenAnswer: false,
  hasRunError: false,
  isBusy: false,
});

type RegisterPageContext = (context: CopilotPageContext, onRefetch?: () => void) => () => void;

/**
 * Stable on purpose and kept apart from the chat context: pages that only register their
 * workflow/step (canvas, step editor) must not re-render on every streamed message.
 */
export const CopilotRegisterContext = createContext<RegisterPageContext>(() => noop);

type CopilotSidebarControlValue = {
  isGenerating: boolean;
  isRevealPending: boolean;
  /** Called while a page renders the web-chat sidebar; only then can ⌘J and ⌘K "Ask Copilot" reveal it. */
  registerSidebar: () => () => void;
};

/** Kept apart from the chat context: the page that renders the sidebar reads it and must not re-render on every streamed message. */
export const CopilotSidebarControlContext = createContext<CopilotSidebarControlValue>({
  isGenerating: false,
  isRevealPending: false,
  registerSidebar: () => noop,
});

export function useCopilotWebChat(): CopilotWebChatContextValue {
  return useContext(CopilotWebChatContext);
}

/**
 * Registers the current page's workflow/step with the Copilot and the callback that refreshes
 * the page after the agent edits the workflow. No-ops outside a `CopilotWebChatProvider`.
 */
export function useRegisterCopilotContext({
  workflowId,
  stepId,
  workflowLabel,
  stepLabel,
  onRefetch,
  enabled = true,
}: CopilotPageContext & { onRefetch?: () => void; enabled?: boolean }) {
  const registerPageContext = useContext(CopilotRegisterContext);
  const onRefetchRef = useRef(onRefetch);
  onRefetchRef.current = onRefetch;

  useEffect(() => {
    if (!enabled) return;

    return registerPageContext({ workflowId, stepId, workflowLabel, stepLabel }, () => onRefetchRef.current?.());
  }, [enabled, registerPageContext, workflowId, stepId, workflowLabel, stepLabel]);
}
