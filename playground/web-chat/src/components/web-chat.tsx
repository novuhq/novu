'use client';

/**
 * START HERE — the `useWebChat` example.
 *
 * Minimal app shape (drop playground extras):
 *
 *   const { messages, sendMessage, respondToAction, isRunning, isLoading, error } =
 *     useWebChat({ agentId });
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
 * Swap `ChatPanel` (assistant-ui Thread) for your UI; keep the hook wiring.
 */

import type { AgentConversationStatus, AgentEventEnvelope, AgentMessage } from '@novu/react';
import { useWebChat } from '@novu/react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { config } from '../config';
import { useApprovalAlert } from '../lib/approval-alert';
import { type ConversationSummary } from '../lib/conversations';
import { type RunOrigin, type RunTransition, runOrigin, useRunActivity } from '../lib/run-activity';
import {
  mapConversationsToThreadData,
  NEW_CONVERSATION_THREAD_ID,
} from '../lib/thread-list-mapper';
import { WebChatRuntimeProvider } from './assistant-ui/web-chat-runtime';
import { ChatPanel } from './chat-panel';

/** Live hook fields the playground sidebar displays. */
export type WebChatSession = {
  conversationId?: string;
  isRunning: boolean;
  conversationStatus: AgentConversationStatus;
  pendingApprovalCount: number;
  runOrigin: RunOrigin;
  lastRunTransition?: RunTransition;
};

type WebChatThreadListProps = {
  items: ConversationSummary[];
  isLoading: boolean;
  onSwitchToThread: (identifier: string) => void;
  onSwitchToNewThread: () => void;
};

type WebChatProps = {
  /**
   * Resume an existing conversation. Omit to start a new one —
   * the first `sendMessage` creates the conversation id.
   */
  conversationId?: string;
  /** Playground: refresh the recent list after an assistant reply. */
  onAssistantMessage?: () => void;
  /** Playground: assistant-ui ThreadList backed by ExternalStoreThreadListAdapter. */
  threadList?: WebChatThreadListProps;
  /** Playground chrome only — omit in a real app. */
  sidebar?: (session: WebChatSession) => ReactNode;
};

export function WebChat({
  conversationId,
  onAssistantMessage,
  threadList,
  sidebar,
}: WebChatProps) {
  // Optional hook callbacks (background approval ping + run-lifecycle diagnostics).
  const onActionRequested = useApprovalAlert();
  const { lastTransition, onEvent: onRunEvent } = useRunActivity();
  const [runError, setRunError] = useState<{ message: string }>();

  const onEvent = useCallback(
    (envelope: AgentEventEnvelope) => {
      onRunEvent(envelope);

      const { type } = envelope.event;
      // Hook `error` does not surface run failures (SDK drops run-error at publish).
      // Track run-error here so the session banner can show agent run failures.
      if (type === 'run-error') {
        setRunError({ message: envelope.event.message });
      } else if (type === 'run-finish' || type === 'run-start') {
        setRunError(undefined);
      }
    },
    [onRunEvent],
  );

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
    sendAction,
    retryMessage,
    conversationId: activeConversationId,
    error,
    isRunning,
    conversationStatus,
    isLoading,
    pagination,
    isRecovering,
    catchUpError,
    refetch,
    typing,
  } = useWebChat({
    agentId: config.agentId,
    conversationId,
    onActionRequested,
    onMessage,
    onEvent,
  });

  const [sending, setSending] = useState(false);

  const sendWithBusy = useCallback(
    async (input: Parameters<typeof sendMessage>[0]) => {
      setSending(true);
      try {
        return await sendMessage(input);
      } finally {
        setSending(false);
      }
    },
    [sendMessage],
  );

  const session: WebChatSession = {
    conversationId: activeConversationId,
    isRunning,
    conversationStatus,
    pendingApprovalCount: pendingActions.filter((action) => action.type === 'tool-approval').length,
    runOrigin: runOrigin(isRunning, lastTransition),
    lastRunTransition: lastTransition,
  };

  // Merge hook HTTP/action errors with onEvent run-error (see comment above).
  const sessionError = error ?? runError;

  const composerBusy = sending || isRunning || isLoading;
  const activeThreadId = activeConversationId ?? conversationId ?? NEW_CONVERSATION_THREAD_ID;

  const ui = useMemo(
    () => ({
      sendAction,
      retryMessage,
      pagination,
      typingLabel: typing?.status,
      pendingActionCount: pendingActions.length,
    }),
    [sendAction, retryMessage, pagination, typing?.status, pendingActions.length],
  );

  const runtimeThreadList = useMemo(() => {
    if (!threadList) return undefined;

    return {
      threadId: activeThreadId,
      threads: mapConversationsToThreadData(threadList.items),
      isLoading: threadList.isLoading,
      onSwitchToThread: threadList.onSwitchToThread,
      onSwitchToNewThread: threadList.onSwitchToNewThread,
    };
  }, [activeThreadId, threadList]);

  return (
    <WebChatRuntimeProvider
      chat={{ messages, isRunning, isLoading, sendMessage: sendWithBusy, respondToAction }}
      composerBusy={composerBusy}
      threadList={runtimeThreadList}
      ui={ui}
    >
      {sidebar?.(session)}

      <ChatPanel
        error={sessionError}
        isRecovering={isRecovering}
        catchUpError={catchUpError}
        refetch={refetch}
      />
    </WebChatRuntimeProvider>
  );
}
