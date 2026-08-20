'use client';

import type { AgentConversationTyping, AgentMessage, AgentPendingAction, UseAgentChatResult } from '@novu/react';
import { ChatThread } from './chat-thread';
import { Composer } from './composer';
import { PendingActionCard } from './pending-action-card';

/**
 * Presentational shell. Swap this (and the components it uses) for your own UI —
 * it only consumes values from `useAgentChat`.
 */
export type ChatPanelProps = {
  subscriberId: string;
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
  subscriberId,
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
      <header className="chat-topbar">
        <p>
          Chatting as <strong>{subscriberId}</strong>
        </p>
      </header>

      <ChatThread
        messages={messages}
        isRunning={isRunning}
        isLoading={isLoading}
        typing={typing}
        hasMore={hasMore}
        isFetching={isFetching}
        onFetchMore={onFetchMore}
        onCardAction={onCardAction}
        cardActionsDisabled={interactionDisabled}
        onSend={onSend}
      />

      <div className="chat-foot">
        <div className="chat-foot-inner">
          {pendingActions.map((action) => (
            <PendingActionCard key={action.id} action={action} disabled={interactionDisabled} onRespond={onRespond} />
          ))}

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
