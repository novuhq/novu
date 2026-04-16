import { ConversationFilters } from '@/api/conversations';

export type ConversationFiltersData = {
  dateRange: string;
  subscriberId: string;
  provider: string[];
  conversationId: string;
};

export type ConversationUrlState = {
  conversationItemId: string | null;
  filters: ConversationFilters;
  filterValues: ConversationFiltersData;
};
