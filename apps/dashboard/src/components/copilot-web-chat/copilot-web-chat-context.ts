import type { UseWebChatResult } from '@novu/react';
import { createContext, useContext, useEffect, useRef } from 'react';
import type { CopilotPageContext } from './copilot-web-chat-utils';

export type CopilotWebChatContextValue = {
  /** False on self-hosted or while the tenant context is unavailable. */
  isAvailable: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  chat?: UseWebChatResult;
  pageContext?: CopilotPageContext;
  sendMessage: (text: string) => Promise<void>;
  /** True when an answer finished while the popover was closed and has not been seen yet. */
  hasUnseenAnswer: boolean;
  hasRunError: boolean;
};

const noop = () => {};

export const CopilotWebChatContext = createContext<CopilotWebChatContextValue>({
  isAvailable: false,
  isOpen: false,
  open: noop,
  close: noop,
  toggle: noop,
  sendMessage: async () => {},
  hasUnseenAnswer: false,
  hasRunError: false,
});

type RegisterPageContext = (context: CopilotPageContext, onRefetch?: () => void) => () => void;

/**
 * Stable on purpose and kept apart from the chat context: pages that only register their
 * workflow/step (canvas, step editor) must not re-render on every streamed message.
 */
export const CopilotRegisterContext = createContext<RegisterPageContext>(() => noop);

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
