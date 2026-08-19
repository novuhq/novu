'use client';

/**
 * START HERE — the `useAgentChat` example.
 *
 * Minimal app shape (drop playground extras):
 *
 *   const { messages, sendMessage, respondToAction, isRunning, isLoading, error } =
 *     useAgentChat({ agentId });
 *
 *   return (
 *     <>
 *       {error ? <p>{error.message}</p> : null}
 *       <MyMessageList messages={messages} onRespond={respondToAction} />
 *       <MyComposer disabled={isRunning || isLoading} onSend={(text) => void sendMessage(text)} />
 *     </>
 *   );
 *
 * Below: same pattern, plus optional callbacks and a sidebar slot for this playground.
 * Swap `ChatPanel` for your UI; keep the hook wiring.
 */

import type { AgentConversationStatus, AgentMessage } from '@novu/react';
import { useAgentChat } from '@novu/react';
import { type ReactNode, useCallback, useState } from 'react';
import { config } from '../config';
import { useApprovalAlert } from '../lib/approval-alert';
import { type RunOrigin, type RunTransition, runOrigin, useRunActivity } from '../lib/run-activity';
import { ChatPanel } from './chat-panel';

/** Live hook fields the playground sidebar displays. */
export type AgentChatSession = {
  conversationId?: string;
  isRunning: boolean;
  status: AgentConversationStatus;
  pendingApprovalCount: number;
  runOrigin: RunOrigin;
  lastRunTransition?: RunTransition;
};

type AgentChatProps = {
  /**
   * Resume an existing conversation. Omit to start a new one —
   * the first `sendMessage` creates the conversation id.
   */
  conversationId?: string;
  /** Playground: refresh the recent list after an assistant reply. */
  onAssistantMessage?: () => void;
  /** Playground chrome only — omit in a real app. */
  sidebar?: (session: AgentChatSession) => ReactNode;
};

export function AgentChat({ conversationId, onAssistantMessage, sidebar }: AgentChatProps) {
  // Optional hook callbacks (background approval ping + run-lifecycle diagnostics).
  const onActionRequested = useApprovalAlert();
  const { lastTransition, onEvent } = useRunActivity();

  const onMessage = useCallback(
    (message: AgentMessage) => {
      if (message.role === 'assistant') onAssistantMessage?.();
    },
    [onAssistantMessage]
  );

  const {
    messages,
    pendingActions,
    sendMessage,
    respondToAction,
    conversationId: activeConversationId,
    error,
    isRunning,
    status,
    isLoading,
    isFetching,
    hasMore,
    fetchMore,
    typing,
  } = useAgentChat({
    agentId: config.agentId,
    conversationId,
    onActionRequested,
    onMessage,
    onEvent,
  });

  const [sending, setSending] = useState(false);

  const onSend = useCallback(
    async (text: string) => {
      setSending(true);
      try {
        await sendMessage(text);
      } finally {
        setSending(false);
      }
    },
    [sendMessage]
  );

  const session: AgentChatSession = {
    conversationId: activeConversationId,
    isRunning,
    status,
    pendingApprovalCount: pendingActions.filter((action) => action.type === 'tool-approval').length,
    runOrigin: runOrigin(isRunning, lastTransition),
    lastRunTransition: lastTransition,
  };

  return (
    <>
      {sidebar?.(session)}

      <ChatPanel
        conversationId={activeConversationId}
        error={error}
        messages={messages}
        pendingActions={pendingActions}
        isRunning={isRunning}
        typing={typing}
        hasMore={hasMore}
        isFetching={isFetching}
        onFetchMore={fetchMore}
        onRespond={respondToAction}
        composerDisabled={sending || isRunning || isLoading}
        onSend={onSend}
      />
    </>
  );
}
