import { ConversationFilters } from '@/api/conversations';

export type ConversationFiltersData = {
  dateRange: string;
  subscriberId: string;
  agentId: string;
  provider: string[];
  conversationId: string;
};

export type ConversationUrlState = {
  conversationItemId: string | null;
  filters: ConversationFilters;
  filterValues: ConversationFiltersData;
};
