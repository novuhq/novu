'use client';

/**
 * START HERE — the `useWebChat` example.
 *
 * Minimal app shape (drop the built-in sidebar if you have your own layout):
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
 * Below: same pattern with assistant-ui Thread and a conversations sidebar.
 * Swap `ChatPanel` / `WebChatThreadList` if the host app already has a chat kit.
 * Keep this hook wiring.
 */

import { useWebChat } from '@novu/react';
import { useCallback, useMemo, useState } from 'react';
import { WebChatThreadList } from './assistant-ui/thread-list';
import { WebChatRuntimeProvider } from './assistant-ui/web-chat-runtime';
import { ChatPanel } from './chat-panel';
import { useConversations } from './lib/conversations';
import { mapConversationsToThreadData, NEW_CONVERSATION_THREAD_ID } from './lib/thread-list-mapper';
import { TooltipProvider } from './ui/tooltip';

type WebChatProps = {
  /** Standalone scaffold passes `config.agentId`; merge mode reads env. */
  agentId?: string;
};

export function WebChat({ agentId: agentIdProp }: WebChatProps = {}) {
  const agentId = agentIdProp ?? process.env.NEXT_PUBLIC_NOVU_AGENT_ID ?? '';
  const [conversationId, setConversationId] = useState<string>();
  const conversations = useConversations();

  const reloadConversations = useCallback(() => {
    void conversations.reload();
  }, [conversations.reload]);

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
    isLoading,
    pagination,
    isRecovering,
    catchUpError,
    refetch,
    typing,
    startNewConversation,
  } = useWebChat({
    agentId,
    conversationId,
    onMessage: (message) => {
      if (message.role === 'assistant') {
        reloadConversations();
      }
    },
  });

  // Platform ack sets `typing` before `run-start`; treat both as "agent working" for UI.
  const showAgentActivity = isRunning || Boolean(typing?.status?.trim());
  const composerBusy =
    messages.some((message) => message.status === 'sending') || showAgentActivity || isLoading;
  const bannerDetail =
    catchUpError?.message ?? (messages.some((message) => message.status === 'failed') ? undefined : error?.message);
  const activeThreadId = activeConversationId ?? conversationId ?? NEW_CONVERSATION_THREAD_ID;

  const ui = useMemo(
    () => ({
      sendAction,
      retryMessage,
      pagination,
      typingLabel: typing?.status,
      pendingActionCount: pendingActions.length,
      banner: bannerDetail
        ? {
            title: catchUpError ? "Couldn't sync missed messages" : 'Something went wrong',
            detail: bannerDetail,
            ...(activeConversationId != null ? { onRetry: () => void refetch() } : null),
          }
        : undefined,
    }),
    [
      sendAction,
      retryMessage,
      pagination,
      typing?.status,
      pendingActions.length,
      bannerDetail,
      catchUpError,
      activeConversationId,
      refetch,
    ]
  );

  const runtimeThreadList = useMemo(
    () => ({
      threadId: activeThreadId,
      threads: mapConversationsToThreadData(conversations.items),
      isLoading: conversations.isLoading,
      onSwitchToThread: (identifier: string) => {
        setConversationId(identifier);
      },
      onSwitchToNewThread: () => {
        startNewConversation();
        setConversationId(undefined);
      },
    }),
    [activeThreadId, conversations.items, conversations.isLoading, startNewConversation]
  );

  return (
    <WebChatRuntimeProvider
      chat={{ messages, isRunning: showAgentActivity, isLoading, sendMessage, respondToAction }}
      composerBusy={composerBusy}
      threadList={runtimeThreadList}
      ui={ui}
    >
      <TooltipProvider>
        <div className="shell">
          <div className="workbench">
            <aside className="session-panel" aria-label="Conversations">
              <div className="panel-head">
                <h2>Conversations</h2>
              </div>
              <div className="sidebar-body">
                <WebChatThreadList error={conversations.error} onRetryError={reloadConversations} />
              </div>
            </aside>
            <ChatPanel isRecovering={isRecovering} />
          </div>
        </div>
      </TooltipProvider>
    </WebChatRuntimeProvider>
  );
}
