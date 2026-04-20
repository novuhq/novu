import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConversationFilters } from '@/api/conversations';
import { DEFAULT_DATE_RANGE } from '@/components/activity/constants';
import { ConversationFiltersData, ConversationUrlState } from '@/types/conversation';

function parseFilters(searchParams: URLSearchParams): ConversationFilters {
  const result: ConversationFilters = {};

  const subscriberId = searchParams.get('subscriberId');
  if (subscriberId) {
    result.subscriberId = subscriberId;
  }

  const provider = searchParams.get('provider')?.split(',').filter(Boolean);
  if (provider?.length) {
    result.provider = provider;
  }

  const conversationId = searchParams.get('conversationId');
  if (conversationId) {
    result.conversationId = conversationId;
  }

  const dateRange = searchParams.get('dateRange');
  result.dateRange = dateRange || DEFAULT_DATE_RANGE;

  return result;
}

function parseFilterValues(searchParams: URLSearchParams): ConversationFiltersData {
  return {
    dateRange: searchParams.get('dateRange') || DEFAULT_DATE_RANGE,
    subscriberId: searchParams.get('subscriberId') || '',
    provider: searchParams.get('provider')?.split(',').filter(Boolean) || [],
    conversationId: searchParams.get('conversationId') || '',
  };
}

export function useConversationUrlState(): ConversationUrlState & {
  handleConversationSelect: (conversationItemId: string) => void;
  handleFiltersChange: (data: ConversationFiltersData) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationItemId = searchParams.get('conversationItemId');

  const handleConversationSelect = useCallback(
    (newConversationItemId: string) => {
      const newParams = new URLSearchParams(searchParams);

      if (newConversationItemId === conversationItemId) {
        newParams.delete('conversationItemId');
      } else {
        newParams.set('conversationItemId', newConversationItemId);
      }

      setSearchParams(newParams, { replace: true });
    },
    [conversationItemId, searchParams, setSearchParams]
  );

  const handleFiltersChange = useCallback(
    (data: ConversationFiltersData) => {
      const newParams = new URLSearchParams();

      if (conversationItemId) {
        newParams.set('conversationItemId', conversationItemId);
      }

      if (data.subscriberId) {
        newParams.set('subscriberId', data.subscriberId);
      }

      if (data.provider?.length) {
        newParams.set('provider', data.provider.join(','));
      }

      if (data.conversationId) {
        newParams.set('conversationId', data.conversationId);
      }

      if (data.dateRange && data.dateRange !== DEFAULT_DATE_RANGE) {
        newParams.set('dateRange', data.dateRange);
      }

      setSearchParams(newParams, { replace: true });
    },
    [conversationItemId, setSearchParams]
  );

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const filterValues = useMemo(() => parseFilterValues(searchParams), [searchParams]);

  return {
    conversationItemId,
    filters,
    filterValues,
    handleConversationSelect,
    handleFiltersChange,
  };
}
