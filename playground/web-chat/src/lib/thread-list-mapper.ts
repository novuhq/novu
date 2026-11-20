import type { ExternalStoreThreadData } from '@assistant-ui/react';
import type { ConversationSummary } from './conversations';

/** Runtime id for a lazy-created conversation that has no Novu identifier yet. */
export const NEW_CONVERSATION_THREAD_ID = '__new__';

export function conversationToThreadData(
  item: ConversationSummary,
): ExternalStoreThreadData<'regular'> {
  return {
    id: item.identifier,
    status: 'regular',
    title: item.title || item.identifier,
    custom: {
      lastActivityAt: item.lastActivityAt,
      agentIdentifier: item.agentIdentifier,
      conversationStatus: item.status,
      createdAt: item.createdAt,
    },
  };
}

export function mapConversationsToThreadData(
  items: ConversationSummary[],
): ExternalStoreThreadData<'regular'>[] {
  return items.map(conversationToThreadData);
}
