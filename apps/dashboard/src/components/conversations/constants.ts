import { CONVERSATIONAL_PROVIDERS } from '@novu/shared';
import { ConversationFiltersData } from '@/types/conversation';
import { getAgentChannelDisplayName } from '@/utils/agent-email-provider-display';

export const PROVIDER_OPTIONS = CONVERSATIONAL_PROVIDERS.filter((p) => !p.comingSoon).map((p) => ({
  label: getAgentChannelDisplayName(p.providerId, p.displayName),
  value: p.providerId,
}));

export const defaultConversationFilters: ConversationFiltersData = {
  dateRange: '24h',
  subscriberId: '',
  agentId: '',
  provider: [],
  conversationId: '',
} as const;
