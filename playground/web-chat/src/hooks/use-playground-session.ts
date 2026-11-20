'use client';

import { useCallback, useState } from 'react';

/** Playground-only: which conversation the page is showing. */
export function usePlaygroundSession() {
  const [conversationId, setConversationId] = useState<string | undefined>();

  const onNewChat = useCallback(() => {
    setConversationId(undefined);
  }, []);

  const onSelectConversation = useCallback((identifier: string) => {
    setConversationId(identifier);
  }, []);

  return {
    conversationId,
    onNewChat,
    onSelectConversation,
  };
}
