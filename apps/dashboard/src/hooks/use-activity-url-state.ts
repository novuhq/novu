import { ActivityFilters } from '@/api/activity';
import { ActivityFiltersData, ActivityUrlState } from '@/types/activity';
import { ChannelTypeEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULT_DATE_RANGE = '30d';

function parseFilters(searchParams: URLSearchParams): ActivityFilters {
  const result: ActivityFilters = {};

  const channels = searchParams.get('channels')?.split(',').filter(Boolean);
  if (channels?.length) {
    result.channels = channels as ChannelTypeEnum[];
  }

  const workflows = searchParams.get('workflows')?.split(',').filter(Boolean);
  if (workflows?.length) {
    result.workflows = workflows;
  }

  const transactionId = searchParams.get('transactionId');
  if (transactionId) {
    result.transactionId = transactionId;
  }

  const subscriberId = searchParams.get('subscriberId');
  if (subscriberId) {
    result.subscriberId = subscriberId;
  }

  const dateRange = searchParams.get('dateRange');
  result.dateRange = dateRange || DEFAULT_DATE_RANGE;

  return result;
}

function parseFilterValues(searchParams: URLSearchParams): ActivityFiltersData {
  return {
    dateRange: searchParams.get('dateRange') || DEFAULT_DATE_RANGE,
    channels: (searchParams.get('channels')?.split(',').filter(Boolean) as ChannelTypeEnum[]) || [],
    workflows: searchParams.get('workflows')?.split(',').filter(Boolean) || [],
    transactionId: searchParams.get('transactionId') || '',
    subscriberId: searchParams.get('subscriberId') || '',
  };
}

export function useActivityUrlState(): ActivityUrlState & {
  handleActivitySelect: (activityItemId: string) => void;
  handleFiltersChange: (data: ActivityFiltersData) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const activityItemId = searchParams.get('activityItemId');

  const handleActivitySelect = useCallback(
    (newActivityItemId: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (newActivityItemId === activityItemId) {
        newParams.delete('activityItemId');
      } else {
        newParams.set('activityItemId', newActivityItemId);
      }
      setSearchParams(newParams, { replace: true });
    },
    [activityItemId, searchParams, setSearchParams]
  );

  const handleFiltersChange = useCallback(
    (data: ActivityFiltersData) => {
      const newParams = new URLSearchParams();

      // First, preserve the activity selection if it exists
      if (activityItemId) {
        newParams.set('activityItemId', activityItemId);
      }

      // Then set the filter values
      if (data.channels?.length) {
        newParams.set('channels', data.channels.join(','));
      }
      if (data.workflows?.length) {
        newParams.set('workflows', data.workflows.join(','));
      }
      if (data.transactionId) {
        newParams.set('transactionId', data.transactionId);
      }
      if (data.subscriberId) {
        newParams.set('subscriberId', data.subscriberId);
      }
      if (data.dateRange && data.dateRange !== DEFAULT_DATE_RANGE) {
        newParams.set('dateRange', data.dateRange);
      }

      if (searchParams.get('page')) {
        newParams.set('page', searchParams.get('page') || '0');
      }

      setSearchParams(newParams, { replace: true });
    },
    [activityItemId, setSearchParams]
  );

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const filterValues = useMemo(() => parseFilterValues(searchParams), [searchParams]);

  return {
    activityItemId,
    filters,
    filterValues,
    handleActivitySelect,
    handleFiltersChange,
  };
}
