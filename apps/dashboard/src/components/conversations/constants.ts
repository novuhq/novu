import type { ConversationalProvider } from '@novu/shared';
import { ConversationFiltersData } from '@/types/conversation';
import { getAgentChannelDisplayName } from '@/utils/agent-email-provider-display';

/**
 * Provider filter options for the conversations table. Callers pass the channels the org is
 * allowed to see (see `useConversationalProviders`) so unreleased channels stay hidden.
 */
export function buildProviderFilterOptions(providers: readonly ConversationalProvider[]) {
  return providers
    .filter((p) => !p.comingSoon)
    .map((p) => ({
      label: getAgentChannelDisplayName(p.providerId, p.displayName),
      value: p.providerId,
    }));
}

export const defaultConversationFilters: ConversationFiltersData = {
  dateRange: '24h',
  subscriberId: '',
  agentId: '',
  provider: [],
  conversationId: '',
} as const;
