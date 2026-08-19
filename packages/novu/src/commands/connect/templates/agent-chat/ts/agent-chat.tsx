'use client';

import { useAgentChat } from '@novu/react';
import { config } from '@/config';
import { ChatPanel } from './chat-panel';

export function AgentChat() {
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
  } = useAgentChat({ agentId: config.agentId });

  return (
    <ChatPanel
      subscriberId={config.subscriberId}
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
