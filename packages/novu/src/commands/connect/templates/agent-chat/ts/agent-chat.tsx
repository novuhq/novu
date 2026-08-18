'use client';

import { useAgentChat } from '@novu/react';
import { useCallback, useState } from 'react';
import { config } from '@/config';
import { ChatPanel } from './chat-panel';

export function AgentChat() {
  const {
    messages,
    pendingActions,
    sendMessage,
    respondToAction,
    conversationId,
    error,
    isRunning,
    isLoading,
    typing,
    hasMore,
    isFetching,
    fetchMore,
  } = useAgentChat({ agentId: config.agentId });

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

  return (
    <ChatPanel
      conversationId={conversationId}
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
  );
}
