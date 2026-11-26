import type { UseWebChatResult } from '@novu/react';
import { getUserMessageText } from './copilot-web-chat-utils';

const DEFAULT_TITLE = 'Novu Copilot';

type FirstPromptChat = Pick<UseWebChatResult, 'messages' | 'isLoading' | 'pagination'>;

/**
 * The conversation's first prompt once it is known: in a new chat, or in a resumed one with no older page left to
 * load. Until then the first loaded message is just the oldest one on the loaded page.
 */
export function getFirstPromptTitle(chat: FirstPromptChat): string | undefined {
  if (chat.isLoading || chat.pagination.hasMore) return undefined;

  const firstUserMessage = chat.messages.find((message) => message.role === 'user');

  return (firstUserMessage && getUserMessageText(firstUserMessage)) || undefined;
}

/**
 * The conversation's title, saved on the conversation: the Copilot names the chat and renames it when the topic
 * changes. A new chat has no title until the Copilot names it, so it shows its first prompt meanwhile.
 */
export function getCopilotPopoverTitle(chat: (FirstPromptChat & Pick<UseWebChatResult, 'title'>) | undefined): string {
  if (!chat) return DEFAULT_TITLE;

  return chat.title?.trim() || getFirstPromptTitle(chat) || DEFAULT_TITLE;
}
