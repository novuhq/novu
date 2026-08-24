'use client';

import { useAgentChat } from '@novu/react';
import { ChatPanel } from './chat-panel';

export function AgentChat() {
  const agentId = process.env.NEXT_PUBLIC_NOVU_AGENT_ID ?? '';
  const subscriberId = process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '';

  const {
    messages,
    pendingActions = [],
    sendMessage,
    sendAction,
    respondToAction,
    error,
    isRunning,
    isLoading,
    typing,
    hasMore,
    isFetching,
    fetchMore,
  } = useAgentChat({ agentId });

  return (
    <ChatPanel
      subscriberId={subscriberId}
      error={error}
      messages={messages}
      pendingActions={pendingActions}
      isRunning={isRunning}
      isLoading={isLoading}
      typing={typing}
      hasMore={hasMore}
      isFetching={isFetching}
      onFetchMore={fetchMore}
      onRespond={respondToAction}
      onCardAction={sendAction}
      onSend={sendMessage}
    />
  );
}
