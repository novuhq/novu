import type { ConversationRepository } from '@novu/dal';

export function withAgentChatContextFilter<T extends Record<string, unknown>>(
  repository: ConversationRepository,
  query: T,
  contextKeys?: string[]
): T & { $and: Record<string, unknown>[] } {
  return {
    ...query,
    $and: [repository.buildContextExactMatchQuery(contextKeys ?? [])],
  };
}
