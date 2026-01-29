import { ChannelTypeEnum, SeverityLevelEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActivityFilters } from '@/api/activity';
import { DEFAULT_DATE_RANGE } from '@/components/activity/constants';
import { ActivityFiltersData, ActivityUrlState } from '@/types/activity';

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
  const transactionIds = searchParams.getAll('transactionId');

  if (transactionIds.length > 1) {
    result.transactionId = transactionIds.join(',');
  } else if (transactionId) {
    result.transactionId = transactionId;
  }

  const subscriberId = searchParams.get('subscriberId');

  if (subscriberId) {
    result.subscriberId = subscriberId;
  }

  const topicKey = searchParams.get('topicKey');

  if (topicKey) {
    result.topicKey = topicKey;
  }

  const subscriptionId = searchParams.get('subscriptionId');

  if (subscriptionId) {
    result.subscriptionId = subscriptionId;
  }

  const dateRange = searchParams.get('dateRange');
  result.dateRange = dateRange || DEFAULT_DATE_RANGE;

  const severity = searchParams.get('severity')?.split(',').filter(Boolean);
  if (severity?.length) {
    result.severity = severity as SeverityLevelEnum[];
  }

  const contextKeys = searchParams.getAll('contextKeys');

  if (contextKeys.length > 0) {
    result.contextKeys = contextKeys;
  }

  return result;
}

function parseFilterValues(searchParams: URLSearchParams): ActivityFiltersData {
  const transactionIds = searchParams.getAll('transactionId');

  return {
    dateRange: searchParams.get('dateRange') || DEFAULT_DATE_RANGE,
    channels: (searchParams.get('channels')?.split(',').filter(Boolean) as ChannelTypeEnum[]) || [],
    workflows: searchParams.get('workflows')?.split(',').filter(Boolean) || [],
    transactionId: transactionIds.length > 0 ? transactionIds.join(', ') : '',
    subscriberId: searchParams.get('subscriberId') || '',
    topicKey: searchParams.get('topicKey') || '',
    subscriptionId: searchParams.get('subscriptionId') || '',
    severity: (searchParams.get('severity')?.split(',').filter(Boolean) as SeverityLevelEnum[]) || [],
    contextKeys: searchParams.getAll('contextKeys'),
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
        // Parse comma-delimited string into array for backend
        const transactionIds = data.transactionId
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

        if (transactionIds.length > 1) {
          for (const id of transactionIds) {
            newParams.append('transactionId', id);
          }
        } else {
          newParams.set('transactionId', data.transactionId);
        }
      }

      if (data.subscriberId) {
        newParams.set('subscriberId', data.subscriberId);
      }

      if (data.topicKey) {
        newParams.set('topicKey', data.topicKey);
      }

      if (data.subscriptionId) {
        newParams.set('subscriptionId', data.subscriptionId);
      }

      if (data.dateRange && data.dateRange !== DEFAULT_DATE_RANGE) {
        newParams.set('dateRange', data.dateRange);
      }

      if (searchParams.get('page')) {
        newParams.set('page', searchParams.get('page') || '0');
      }

      if (data.severity?.length) {
        newParams.set('severity', data.severity.join(','));
      }

      if (data.contextKeys?.length) {
        for (const contextKey of data.contextKeys) {
          newParams.append('contextKeys', contextKey);
        }
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
