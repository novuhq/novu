'use client';

import { useCallback, useState } from 'react';

/**
 * Playground-only: which conversation the page is showing.
 *
 * `useWebChat` remounts when `sessionKey` changes so a new chat / resume gets a
 * fresh hook instance (the hook keys off the `conversationId` prop + mount).
 */
export function usePlaygroundSession() {
  const [sessionKey, setSessionKey] = useState(0);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [resumeDraft, setResumeDraft] = useState('');

  const remount = useCallback((nextId?: string) => {
    setConversationId(nextId);
    setSessionKey((key) => key + 1);
  }, []);

  const onNewChat = useCallback(() => {
    setResumeDraft('');
    remount(undefined);
  }, [remount]);

  const onResume = useCallback(() => {
    const id = resumeDraft.trim();
    if (!id) return;
    remount(id);
  }, [remount, resumeDraft]);

  const onSelectConversation = useCallback(
    (identifier: string) => {
      setResumeDraft(identifier);
      remount(identifier);
    },
    [remount]
  );

  return {
    sessionKey,
    conversationId,
    resumeDraft,
    setResumeDraft,
    onNewChat,
    onResume,
    onSelectConversation,
  };
}
