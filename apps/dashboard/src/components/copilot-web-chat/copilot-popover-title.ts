import type { UseWebChatResult } from '@novu/react';
import { useEffect, useMemo } from 'react';
import { getUserMessageText } from './copilot-web-chat-utils';

const DEFAULT_TITLE = 'Novu Copilot';
const TITLE_STORAGE_PREFIX = 'novu-copilot-title:';
// The header shows a single truncated line, so a long guided prompt is not stored whole.
const MAX_STORED_TITLE_LENGTH = 200;

type TitleStorage = Pick<Storage, 'getItem' | 'setItem'>;

const getLocalStorage = (): TitleStorage => window.localStorage;

/**
 * The conversation's first prompt once it is known: in a new chat, or in a resumed one with no older page left to
 * load. Until then the first loaded message is just the oldest one on the loaded page.
 */
export function getFirstPromptTitle(
  chat: Pick<UseWebChatResult, 'messages' | 'isLoading' | 'pagination'>
): string | undefined {
  if (chat.isLoading || chat.pagination.hasMore) return undefined;

  const firstUserMessage = chat.messages.find((message) => message.role === 'user');

  return (firstUserMessage && getUserMessageText(firstUserMessage)) || undefined;
}

export function readStoredCopilotTitle(
  conversationId: string | undefined,
  getStorage = getLocalStorage
): string | undefined {
  if (!conversationId) return undefined;

  try {
    return getStorage().getItem(`${TITLE_STORAGE_PREFIX}${conversationId}`) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredCopilotTitle(conversationId: string, title: string, getStorage = getLocalStorage): void {
  try {
    getStorage().setItem(`${TITLE_STORAGE_PREFIX}${conversationId}`, title.slice(0, MAX_STORED_TITLE_LENGTH));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the header then falls back to the default title.
  }
}

/** One title per conversation: its first prompt, saved per conversation so a partly loaded history keeps showing it. */
export function useCopilotPopoverTitle(chat: UseWebChatResult | undefined): string {
  const conversationId = chat?.conversationId;
  const firstPrompt = chat ? getFirstPromptTitle(chat) : undefined;
  const storedTitle = useMemo(() => readStoredCopilotTitle(conversationId), [conversationId]);

  useEffect(() => {
    if (conversationId && firstPrompt) writeStoredCopilotTitle(conversationId, firstPrompt);
  }, [conversationId, firstPrompt]);

  return firstPrompt ?? storedTitle ?? DEFAULT_TITLE;
}
