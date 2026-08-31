'use client';

import type { AgentConversationTyping, AgentMessage, UseWebChatResult } from '@novu/react';
import { ChatThread } from './chat-thread';
import { Composer } from './composer';

/**
 * Presentational shell. Swap this (and the components it uses) for your own UI —
 * it only consumes values from `useWebChat`.
 */
export type ChatPanelProps = {
  error?: { message: string };
  messages: AgentMessage[];
  hasPendingActions: boolean;
  isRunning: boolean;
  isLoading: boolean;
  typing?: AgentConversationTyping;
  hasMore: boolean;
  isFetching: boolean;
  onFetchMore: () => Promise<unknown>;
  onRespond: UseWebChatResult['respondToAction'];
  onCardAction: UseWebChatResult['sendAction'];
  onSend: UseWebChatResult['sendMessage'];
};

export function ChatPanel({
  error,
  messages,
  hasPendingActions,
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
        hasPendingActions={hasPendingActions}
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
