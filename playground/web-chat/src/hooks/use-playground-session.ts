'use client';

import { useCallback, useState } from 'react';

/**
 * Playground-only: which conversation the page is showing.
 *
 * `useWebChat` remounts when `sessionKey` changes so a new chat / thread switch
 * gets a fresh hook instance (the hook keys off the `conversationId` prop + mount).
 */
export function usePlaygroundSession() {
  const [sessionKey, setSessionKey] = useState(0);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const remount = useCallback((nextId?: string) => {
    setConversationId(nextId);
    setSessionKey((key) => key + 1);
  }, []);

  const onNewChat = useCallback(() => {
    remount(undefined);
  }, [remount]);

  const onSelectConversation = useCallback(
    (identifier: string) => {
      remount(identifier);
    },
    [remount],
  );

  return {
    sessionKey,
    conversationId,
    onNewChat,
    onSelectConversation,
  };
}
