'use client';

import { useWebChat } from '@novu/react';
import { ChatPanel } from './chat-panel';

export function WebChat() {
  const agentId = process.env.NEXT_PUBLIC_NOVU_AGENT_ID ?? '';

  const {
    messages,
    pendingActions,
    sendMessage,
    sendAction,
    respondToAction,
    error,
    isRunning,
    isLoading,
    typing,
    pagination,
  } = useWebChat({ agentId });

  return (
    <ChatPanel
      error={error}
      messages={messages}
      hasPendingActions={Boolean(pendingActions?.length)}
      isRunning={isRunning}
      isLoading={isLoading}
      typing={typing}
      hasMore={pagination.hasMore}
      isFetching={pagination.status === 'loading'}
      onFetchMore={pagination.fetchMore}
      onRespond={respondToAction}
      onCardAction={sendAction}
      onSend={sendMessage}
    />
  );
}
