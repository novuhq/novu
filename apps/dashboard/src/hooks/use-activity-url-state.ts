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

  const after = searchParams.get('after');
  const before = searchParams.get('before');
  if (after) {
    result.after = after;
  }
  if (before) {
    result.before = before;
  }

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
    after: searchParams.get('after') || undefined,
    before: searchParams.get('before') || undefined,
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

function appendTransactionIds(searchParams: URLSearchParams, transactionId: string) {
  const transactionIds = transactionId
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (transactionIds.length > 1) {
    for (const id of transactionIds) {
      searchParams.append('transactionId', id);
    }

    return;
  }

  searchParams.set('transactionId', transactionId);
}

function buildFilterSearchParams(data: ActivityFiltersData, activityItemId: string | null, page: string | null) {
  const searchParams = new URLSearchParams();

  if (activityItemId) searchParams.set('activityItemId', activityItemId);
  if (data.channels.length) searchParams.set('channels', data.channels.join(','));
  if (data.workflows.length) searchParams.set('workflows', data.workflows.join(','));
  if (data.transactionId) appendTransactionIds(searchParams, data.transactionId);
  if (data.subscriberId) searchParams.set('subscriberId', data.subscriberId);
  if (data.topicKey) searchParams.set('topicKey', data.topicKey);
  if (data.subscriptionId) searchParams.set('subscriptionId', data.subscriptionId);
  if (data.dateRange !== DEFAULT_DATE_RANGE) searchParams.set('dateRange', data.dateRange);

  if (data.dateRange === 'custom' && data.after && data.before) {
    searchParams.set('after', data.after);
    searchParams.set('before', data.before);
  }

  if (page) searchParams.set('page', page);
  if (data.severity.length) searchParams.set('severity', data.severity.join(','));
  for (const contextKey of data.contextKeys) {
    searchParams.append('contextKeys', contextKey);
  }

  return searchParams;
}

export function useActivityUrlState(): ActivityUrlState & {
  handleActivitySelect: (activityItemId: string) => void;
  handleFiltersChange: (data: ActivityFiltersData) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const activityItemId = searchParams.get('activityItemId');
  const page = searchParams.get('page');

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
      setSearchParams(buildFilterSearchParams(data, activityItemId, page), { replace: true });
    },
    [activityItemId, page, setSearchParams]
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
