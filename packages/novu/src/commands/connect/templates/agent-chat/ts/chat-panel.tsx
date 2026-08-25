'use client';

import type { AgentConversationTyping, AgentMessage, AgentPendingAction, UseAgentChatResult } from '@novu/react';
import { ChatThread } from './chat-thread';
import { Composer } from './composer';

/**
 * Presentational shell. Swap this (and the components it uses) for your own UI —
 * it only consumes values from `useAgentChat`.
 */
export type ChatPanelProps = {
  error?: { message: string };
  messages: AgentMessage[];
  pendingActions: AgentPendingAction[];
  isRunning: boolean;
  isLoading: boolean;
  typing?: AgentConversationTyping;
  hasMore: boolean;
  isFetching: boolean;
  onFetchMore: () => Promise<unknown>;
  onRespond: UseAgentChatResult['respondToAction'];
  onCardAction: UseAgentChatResult['sendAction'];
  onSend: UseAgentChatResult['sendMessage'];
};

export function ChatPanel({
  error,
  messages,
  pendingActions,
  isRunning,
  isLoading,
  typing,
  hasMore,
  isFetching,
  onFetchMore,
  onRespond,
  onCardAction,
  onSend,
}: ChatPanelProps) {
  const interactionDisabled = isRunning || isLoading;

  return (
    <div className="chat-main">
      <ChatThread
        messages={messages}
        isRunning={isRunning}
        isLoading={isLoading}
        typing={typing}
        hasPendingActions={pendingActions.length > 0}
        hasMore={hasMore}
        isFetching={isFetching}
        onFetchMore={onFetchMore}
        onCardAction={onCardAction}
        onRespond={onRespond}
        cardActionsDisabled={interactionDisabled}
        onSend={onSend}
      />

      <div className="chat-foot">
        <div className="chat-foot-inner">
          {error ? (
            <div className="banner-error" role="alert">
              {error.message}
            </div>
          ) : null}

          <Composer isLoading={isLoading} isRunning={isRunning} onSend={onSend} />
        </div>
      </div>
    </div>
  );
}
